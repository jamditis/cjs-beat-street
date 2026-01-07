import Phaser from 'phaser';
import { POI } from '../entities/POI';
import { POIData, POIType, POIFilter } from '../../types/poi';
import { VenueId } from '../../types/venue';
import { eventBus } from '../../lib/EventBus';

export interface POIManagerConfig {
  scene: Phaser.Scene;
  showLabels?: boolean;
  showDistances?: boolean;
  autoLoadFromFirestore?: boolean;
  autoLoadFromTiled?: boolean;
}

export class POIManager {
  private scene: Phaser.Scene;
  private pois: Map<string, POI> = new Map();
  private showLabels: boolean;
  private showDistances: boolean;
  private playerPosition?: { x: number; y: number };
  private proximityRadius = 150;
  private updateTimer?: Phaser.Time.TimerEvent;

  constructor(config: POIManagerConfig) {
    this.scene = config.scene;
    this.showLabels = config.showLabels !== false;
    this.showDistances = config.showDistances || false;

    // Setup periodic update for proximity checks
    this.setupProximityUpdates();

    // Listen for player movement events
    this.setupPlayerTracking();
  }

  /**
   * Register a new POI
   */
  public registerPOI(data: POIData, config?: { showLabel?: boolean; showDistance?: boolean }): POI {
    // Check if POI already exists
    if (this.pois.has(data.id)) {
      console.warn(`POI with id ${data.id} already exists. Updating instead.`);
      this.unregisterPOI(data.id);
    }

    // Create new POI entity
    const poi = new POI({
      scene: this.scene,
      data,
      showLabel: config?.showLabel ?? this.showLabels,
      showDistance: config?.showDistance ?? this.showDistances,
      interactive: true,
    });

    this.pois.set(data.id, poi);

    return poi;
  }

  /**
   * Unregister and destroy a POI
   */
  public unregisterPOI(id: string): boolean {
    const poi = this.pois.get(id);
    if (!poi) {
      return false;
    }

    poi.destroy();
    this.pois.delete(id);
    return true;
  }

  /**
   * Register multiple POIs at once
   */
  public registerMultiplePOIs(poisData: POIData[]): void {
    poisData.forEach((data) => this.registerPOI(data));
  }

  /**
   * Clear all POIs
   */
  public clearAll(): void {
    this.pois.forEach((poi) => poi.destroy());
    this.pois.clear();
  }

  /**
   * Get a POI by ID
   */
  public getPOI(id: string): POI | undefined {
    return this.pois.get(id);
  }

  /**
   * Get all POIs
   */
  public getAllPOIs(): POI[] {
    return Array.from(this.pois.values());
  }

  /**
   * Get all POI data
   */
  public getAllPOIData(): POIData[] {
    return Array.from(this.pois.values()).map((poi) => poi.data);
  }

  /**
   * Find POIs by type
   */
  public getPOIsByType(type: POIType | POIType[]): POI[] {
    const types = Array.isArray(type) ? type : [type];
    return this.getAllPOIs().filter((poi) => types.includes(poi.data.type));
  }

  /**
   * Find POIs by floor
   */
  public getPOIsByFloor(floor: number): POI[] {
    return this.getAllPOIs().filter((poi) => poi.data.floor === floor);
  }

  /**
   * Find POIs by zone
   */
  public getPOIsByZone(zone: string): POI[] {
    return this.getAllPOIs().filter((poi) => poi.data.position.zone === zone);
  }

  /**
   * Get POIs filtered by venue
   */
  public getPOIsByVenue(venueId: VenueId): POI[] {
    return Array.from(this.pois.values()).filter(
      (poi) => poi.data.venueId === venueId
    );
  }

  /**
   * Get POIs filtered by venue and map
   */
  public getPOIsByVenueAndMap(venueId: VenueId, mapId: string): POI[] {
    return Array.from(this.pois.values()).filter(
      (poi) => poi.data.venueId === venueId && poi.data.mapId === mapId
    );
  }

  /**
   * Find POIs near a position
   */
  public getPOIsNearPosition(x: number, y: number, radius: number): POI[] {
    return this.getAllPOIs().filter((poi) => {
      const distance = poi.getDistanceTo(x, y);
      return distance <= radius;
    });
  }

  /**
   * Find POIs with advanced filtering
   */
  public findPOIs(filter: POIFilter): POI[] {
    let results = this.getAllPOIs();

    // Filter by type
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      results = results.filter((poi) => types.includes(poi.data.type));
    }

    // Filter by floor
    if (filter.floor !== undefined) {
      results = results.filter((poi) => poi.data.floor === filter.floor);
    }

    // Filter by zone
    if (filter.zone) {
      results = results.filter((poi) => poi.data.position.zone === filter.zone);
    }

    // Filter by active state
    if (filter.isActive !== undefined) {
      results = results.filter((poi) => poi.data.isActive === filter.isActive);
    }

    // Filter by distance
    if (filter.maxDistance !== undefined && filter.fromPosition) {
      const { x, y } = filter.fromPosition;
      results = results.filter((poi) => poi.getDistanceTo(x, y) <= filter.maxDistance!);
    }

    return results;
  }

  /**
   * Get the closest POI to a position
   */
  public getClosestPOI(x: number, y: number, filter?: POIFilter): POI | null {
    let candidates = filter ? this.findPOIs(filter) : this.getAllPOIs();

    if (candidates.length === 0) {
      return null;
    }

    let closest = candidates[0];
    let minDistance = closest.getDistanceTo(x, y);

    for (let i = 1; i < candidates.length; i++) {
      const distance = candidates[i].getDistanceTo(x, y);
      if (distance < minDistance) {
        minDistance = distance;
        closest = candidates[i];
      }
    }

    return closest;
  }

  /**
   * Highlight a specific POI
   */
  public highlightPOI(id: string): void {
    const poi = this.getPOI(id);
    if (poi) {
      poi.highlight();
    }
  }

  /**
   * Unhighlight a specific POI
   */
  public unhighlightPOI(id: string): void {
    const poi = this.getPOI(id);
    if (poi) {
      poi.unhighlight();
    }
  }

  /**
   * Highlight all POIs of a certain type
   */
  public highlightPOIsByType(type: POIType): void {
    this.getPOIsByType(type).forEach((poi) => poi.highlight());
  }

  /**
   * Unhighlight all POIs
   */
  public unhighlightAll(): void {
    this.getAllPOIs().forEach((poi) => poi.unhighlight());
  }

  /**
   * Set active state for a POI
   */
  public setActive(id: string, active: boolean): void {
    const poi = this.getPOI(id);
    if (poi) {
      poi.setActive(active);
    }
  }

  /**
   * Load POIs from Tiled map object layer
   */
  public loadFromTiledObjectLayer(objectLayer: Phaser.Tilemaps.ObjectLayer): void {
    if (!objectLayer || !objectLayer.objects) {
      console.warn('Invalid Tiled object layer');
      return;
    }

    objectLayer.objects.forEach((obj) => {
      // Skip objects without required properties
      if (!obj.name || !obj.type || obj.x === undefined || obj.y === undefined) {
        return;
      }

      // Parse POI type
      let poiType: POIType;
      try {
        poiType = POIType[obj.type.toUpperCase() as keyof typeof POIType];
      } catch {
        console.warn(`Unknown POI type: ${obj.type}`);
        return;
      }

      // Extract properties from Tiled custom properties
      const properties = obj.properties as unknown as Record<string, unknown> | undefined;

      const poiData: POIData = {
        id: obj.id?.toString() || obj.name.toLowerCase().replace(/\s+/g, '-'),
        type: poiType,
        name: obj.name,
        description: (properties?.description as string) || undefined,
        position: {
          x: obj.x,
          y: obj.y,
          floor: (properties?.floor as number) || undefined,
          zone: (properties?.zone as string) || undefined,
        },
        floor: (properties?.floor as number) || undefined,
        metadata: properties || {},
        isActive: (properties?.isActive as boolean) ?? true,
        isPulsing: (properties?.isPulsing as boolean) || false,
      };

      this.registerPOI(poiData);
    });
  }

  /**
   * Load POIs from Firestore with venue/floor filtering
   */
  public async loadFromFirestore(options: {
    collection?: string;
    venueId: VenueId;
    mapId: string; // 'outdoor' or indoor venue ID
    floor?: number;
  }): Promise<void> {
    const { collection: collectionName = 'poi', venueId, mapId, floor } = options;

    try {
      const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
      const db = getFirestore();

      // Build query with venue and map filters
      let q = query(
        collection(db, collectionName),
        where('venueId', '==', venueId),
        where('mapId', '==', mapId)
      );

      // Add floor filter if specified
      if (floor !== undefined) {
        q = query(q, where('floor', '==', floor));
      }

      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data() as POIData;
        // Ensure the POI has required fields
        if (data.id && data.type && data.name && data.position) {
          this.registerPOI(data);
        }
      });

      console.log(`Loaded ${snapshot.size} POIs for venue=${venueId}, map=${mapId}, floor=${floor ?? 'all'}`);
    } catch (error) {
      console.error('Failed to load POIs from Firestore:', error);
    }
  }

  /**
   * Setup proximity-based updates
   */
  private setupProximityUpdates(): void {
    // Update proximity checks every 500ms
    this.updateTimer = this.scene.time.addEvent({
      delay: 500,
      callback: () => this.updateProximity(),
      loop: true,
    });
  }

  /**
   * Setup player position tracking
   */
  private setupPlayerTracking(): void {
    const unsubscribe = eventBus.on('player-moved', (data: unknown) => {
      const moveData = data as { x: number; y: number; zone: string };
      this.playerPosition = { x: moveData.x, y: moveData.y };
    });

    // Store unsubscribe function for cleanup
    this.scene.events.once('shutdown', () => {
      unsubscribe();
    });
  }

  /**
   * Update proximity-based effects
   */
  private updateProximity(): void {
    if (!this.playerPosition || !this.showDistances) {
      return;
    }

    const { x, y } = this.playerPosition;

    this.getAllPOIs().forEach((poi) => {
      const distance = poi.getDistanceTo(x, y);

      // Update distance display
      if (distance <= this.proximityRadius * 2) {
        poi.updateDistance(distance);
      } else {
        poi.hideDistance();
      }

      // Emit proximity events for very close POIs
      if (distance <= this.proximityRadius) {
        eventBus.emit('poi-proximity', {
          poiId: poi.data.id,
          poiData: poi.data,
          distance,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Set the proximity radius for proximity events
   */
  public setProximityRadius(radius: number): void {
    this.proximityRadius = radius;
  }

  /**
   * Enable/disable distance display for all POIs
   */
  public setShowDistances(show: boolean): void {
    this.showDistances = show;
    if (!show) {
      this.getAllPOIs().forEach((poi) => poi.hideDistance());
    }
  }

  /**
   * Get statistics about current POIs
   */
  public getStats(): {
    total: number;
    byType: Record<string, number>;
    active: number;
    pulsing: number;
  } {
    const stats = {
      total: this.pois.size,
      byType: {} as Record<string, number>,
      active: 0,
      pulsing: 0,
    };

    this.getAllPOIs().forEach((poi) => {
      // Count by type
      const type = poi.data.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count active
      if (poi.data.isActive) {
        stats.active++;
      }

      // Count pulsing
      if (poi.data.isPulsing) {
        stats.pulsing++;
      }
    });

    return stats;
  }

  /**
   * Cleanup and destroy the manager
   */
  public destroy(): void {
    if (this.updateTimer) {
      this.updateTimer.destroy();
    }

    this.clearAll();
  }
}
