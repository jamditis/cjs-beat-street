/**
 * BuildingFootprintSystem - Integrates GeoJSON loading, coordinate transformation, and rendering
 *
 * This system orchestrates:
 * 1. Loading building footprints from GeoJSON files
 * 2. Transforming coordinates from lat/lng to game world coordinates
 * 3. Rendering buildings using the BuildingRenderer
 *
 * Usage:
 *   const system = new BuildingFootprintSystem(scene, { origin: { lat: 40.4462, lng: -79.9959 } });
 *   await system.loadFromGeoJSON('/assets/maps/pittsburgh-buildings.geojson');
 */

import Phaser from 'phaser';
import { GeoJSONLoader, BuildingData as GeoJSONBuildingData } from '../../services/GeoJSONLoader';
import { CoordinateTransformer, LatLng } from '../../services/CoordinateTransformer';
import { BuildingRenderer, BuildingData, BuildingType } from './BuildingRenderer';

/**
 * Configuration for the BuildingFootprintSystem
 */
export interface BuildingFootprintConfig {
  /** Origin point for coordinate transformation (where game 0,0 maps to) */
  origin: LatLng;
  /** Scale factor: how many meters per game unit (default: 1.0) */
  metersPerGameUnit?: number;
  /** Offset to apply to all transformed coordinates */
  worldOffset?: { x: number; y: number };
  /** Whether to enable building interactivity (default: true) */
  interactive?: boolean;
  /** Maximum number of buildings to render (for performance) */
  maxBuildings?: number;
  /** Minimum building area to render (filters tiny buildings) */
  minBuildingArea?: number;
}

/**
 * Maps OSM building tags to BuildingType enum
 */
function osmTagToBuildingType(tag: string | undefined): BuildingType {
  if (!tag) return BuildingType.COMMERCIAL;

  const normalized = tag.toLowerCase().trim();

  switch (normalized) {
    case 'hotel':
    case 'motel':
      return BuildingType.HOTEL;

    case 'restaurant':
    case 'cafe':
    case 'fast_food':
      return BuildingType.RESTAURANT;

    case 'retail':
    case 'shop':
    case 'store':
    case 'supermarket':
    case 'mall':
      return BuildingType.RETAIL;

    case 'office':
    case 'offices':
    case 'commercial':
      return BuildingType.OFFICE;

    case 'parking':
    case 'parking_garage':
    case 'garage':
      return BuildingType.PARKING;

    case 'industrial':
    case 'warehouse':
    case 'factory':
      return BuildingType.INDUSTRIAL;

    case 'residential':
    case 'apartments':
    case 'house':
    case 'detached':
      return BuildingType.RESIDENTIAL;

    case 'university':
    case 'college':
    case 'school':
    case 'civic':
    case 'public':
    case 'government':
      return BuildingType.CULTURAL;

    case 'park':
    case 'garden':
      return BuildingType.PARK;

    default:
      // Check for partial matches
      if (normalized.includes('hotel') || normalized.includes('motel')) {
        return BuildingType.HOTEL;
      }
      if (normalized.includes('restaurant') || normalized.includes('cafe')) {
        return BuildingType.RESTAURANT;
      }
      if (normalized.includes('office')) {
        return BuildingType.OFFICE;
      }
      if (normalized.includes('residential') || normalized.includes('apartment')) {
        return BuildingType.RESIDENTIAL;
      }
      return BuildingType.COMMERCIAL;
  }
}

/**
 * BuildingFootprintSystem - Main integration class
 */
export class BuildingFootprintSystem {
  private scene: Phaser.Scene;
  private config: Required<BuildingFootprintConfig>;
  private geoJSONLoader: GeoJSONLoader;
  private transformer: CoordinateTransformer;
  private renderer: BuildingRenderer;
  private loadedBuildings: Map<string, BuildingData> = new Map();
  private isLoading = false;

  constructor(scene: Phaser.Scene, config: BuildingFootprintConfig) {
    this.scene = scene;

    // Set defaults
    this.config = {
      origin: config.origin,
      metersPerGameUnit: config.metersPerGameUnit ?? 1.0,
      worldOffset: config.worldOffset ?? { x: 0, y: 0 },
      interactive: config.interactive ?? true,
      maxBuildings: config.maxBuildings ?? 1000,
      minBuildingArea: config.minBuildingArea ?? 50, // 50 square meters minimum
    };

    // Initialize sub-systems
    this.geoJSONLoader = new GeoJSONLoader({
      defaultHeight: 10,
      defaultLevels: 3,
      metersPerLevel: 3.5,
      autoSimplify: true,
      simplifyTolerance: 0.00001,
    });

    this.transformer = new CoordinateTransformer({
      origin: this.config.origin,
      metersPerGameUnit: this.config.metersPerGameUnit,
      tileWidth: 64,
      tileHeight: 32,
    });

    this.renderer = new BuildingRenderer(scene);
  }

  /**
   * Load and render buildings from a GeoJSON file
   * @param path Path to the GeoJSON file
   * @returns Promise resolving to the number of buildings loaded
   */
  async loadFromGeoJSON(path: string): Promise<number> {
    if (this.isLoading) {
      console.warn('[BuildingFootprintSystem] Already loading, please wait');
      return 0;
    }

    this.isLoading = true;
    console.log(`[BuildingFootprintSystem] Loading buildings from ${path}`);

    try {
      // Load GeoJSON data
      const geoJSONBuildings = await this.geoJSONLoader.loadFromFile(path);
      console.log(`[BuildingFootprintSystem] Parsed ${geoJSONBuildings.length} buildings from GeoJSON`);

      // Transform and render buildings
      let count = 0;
      for (const geoBuilding of geoJSONBuildings) {
        if (count >= this.config.maxBuildings) {
          console.log(`[BuildingFootprintSystem] Reached max buildings limit (${this.config.maxBuildings})`);
          break;
        }

        const building = this.transformBuilding(geoBuilding);
        if (building) {
          this.loadedBuildings.set(building.id, building);
          this.renderer.addBuilding(building);
          count++;
        }
      }

      console.log(`[BuildingFootprintSystem] Rendered ${count} buildings`);
      return count;
    } catch (error) {
      console.error('[BuildingFootprintSystem] Failed to load buildings:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Transform a GeoJSON building to game-ready BuildingData
   */
  private transformBuilding(geoBuilding: GeoJSONBuildingData): BuildingData | null {
    // Get the outer ring of the polygon (first coordinate array)
    const outerRing = geoBuilding.coordinates[0];
    if (!outerRing || outerRing.length < 3) {
      return null;
    }

    // Transform coordinates from [lng, lat] to game coordinates
    const footprint: Array<{ x: number; y: number }> = [];

    for (const coord of outerRing) {
      const [lng, lat] = coord;
      const gameCoord = this.transformer.latLngToGame({ lat, lng });

      // Apply world offset
      footprint.push({
        x: gameCoord.x + this.config.worldOffset.x,
        y: gameCoord.y + this.config.worldOffset.y,
      });
    }

    // Calculate approximate area (for filtering small buildings)
    const area = this.calculatePolygonArea(footprint);
    if (area < this.config.minBuildingArea) {
      return null;
    }

    // Determine building type from OSM tags
    const buildingType = osmTagToBuildingType(geoBuilding.type);

    return {
      id: geoBuilding.id,
      type: buildingType,
      name: geoBuilding.name,
      height: geoBuilding.height,
      footprint,
      interactive: this.config.interactive,
      metadata: {
        levels: geoBuilding.levels,
        originalType: geoBuilding.type,
        area,
      },
    };
  }

  /**
   * Calculate polygon area using the Shoelace formula
   */
  private calculatePolygonArea(points: Array<{ x: number; y: number }>): number {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return Math.abs(area / 2);
  }

  /**
   * Update visibility culling based on camera viewport
   * Call this in the scene's update() method
   */
  updateVisibility(): void {
    const camera = this.scene.cameras.main;
    const viewBounds = new Phaser.Geom.Rectangle(
      camera.worldView.x,
      camera.worldView.y,
      camera.worldView.width,
      camera.worldView.height
    );
    this.renderer.updateVisibility(viewBounds);
  }

  /**
   * Get building at a specific world position
   */
  getBuildingAt(x: number, y: number): BuildingData | null {
    return this.renderer.getBuildingAt(x, y);
  }

  /**
   * Get all loaded buildings
   */
  getAllBuildings(): BuildingData[] {
    return this.renderer.getAllBuildings();
  }

  /**
   * Get buildings by type
   */
  getBuildingsByType(type: BuildingType | BuildingType[]): BuildingData[] {
    return this.renderer.getBuildingsByType(type);
  }

  /**
   * Get statistics about loaded buildings
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    visible: number;
    highlighted: number;
  } {
    return this.renderer.getStats();
  }

  /**
   * Clear all buildings
   */
  clear(): void {
    this.renderer.clearAll();
    this.loadedBuildings.clear();
  }

  /**
   * Cleanup and destroy the system
   */
  destroy(): void {
    this.clear();
    this.renderer.destroy();
  }

  /**
   * Get the underlying renderer for advanced usage
   */
  getRenderer(): BuildingRenderer {
    return this.renderer;
  }

  /**
   * Get the coordinate transformer for manual transformations
   */
  getTransformer(): CoordinateTransformer {
    return this.transformer;
  }
}

/**
 * Pre-configured origins for CJS2026 conference venues
 */
export const VENUE_ORIGINS: Record<string, LatLng> = {
  pittsburgh: {
    lat: 40.4462,
    lng: -79.9959,
  },
  philadelphia: {
    lat: 39.9550,
    lng: -75.1605,
  },
  chapelhill: {
    lat: 35.9049,
    lng: -79.0469,
  },
};

/**
 * Create a BuildingFootprintSystem with pre-configured venue settings
 */
export function createBuildingSystem(
  scene: Phaser.Scene,
  venue: 'pittsburgh' | 'philadelphia' | 'chapelhill',
  overrides?: Partial<BuildingFootprintConfig>
): BuildingFootprintSystem {
  const origin = VENUE_ORIGINS[venue];
  if (!origin) {
    throw new Error(`Unknown venue: ${venue}`);
  }

  return new BuildingFootprintSystem(scene, {
    origin,
    metersPerGameUnit: 1.0,
    worldOffset: { x: 1200, y: 900 }, // Center of typical 2400x1800 world
    interactive: true,
    maxBuildings: 500,
    minBuildingArea: 100,
    ...overrides,
  });
}
