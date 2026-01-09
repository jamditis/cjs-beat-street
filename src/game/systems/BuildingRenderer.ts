import Phaser from 'phaser';

/**
 * Building type enumeration for different color schemes
 */
export enum BuildingType {
  COMMERCIAL = 'commercial',
  RESIDENTIAL = 'residential',
  HOTEL = 'hotel',
  RESTAURANT = 'restaurant',
  OFFICE = 'office',
  RETAIL = 'retail',
  CULTURAL = 'cultural',
  INDUSTRIAL = 'industrial',
  PARK = 'park',
  PARKING = 'parking',
}

/**
 * Building data structure matching GeoJSON feature properties
 */
export interface BuildingData {
  id: string;
  type: BuildingType;
  name?: string;
  height?: number; // In meters, for 3D effect
  footprint: Array<{ x: number; y: number }>; // Polygon points
  metadata?: Record<string, unknown>;
  interactive?: boolean;
}

/**
 * Rendered building instance with graphics objects
 */
interface RenderedBuilding {
  data: BuildingData;
  floor: Phaser.GameObjects.Graphics; // Base footprint
  walls: Phaser.GameObjects.Graphics; // Isometric walls for 3D effect
  bounds: Phaser.Geom.Rectangle; // For culling and hit testing
  visible: boolean;
  highlighted: boolean;
}

/**
 * Building color scheme configuration
 */
interface BuildingColorScheme {
  floor: number; // Base color
  floorAlpha: number;
  wall: number; // Wall color (darker)
  wallAlpha: number;
  stroke: number; // Outline color
  strokeAlpha: number;
  highlight: number; // Highlight color on hover
}

/**
 * BuildingRenderer system for rendering building footprints in Phaser
 * Supports isometric 3D effect, depth sorting, viewport culling, and interactions
 */
export class BuildingRenderer {
  private scene: Phaser.Scene;
  private buildings: Map<string, RenderedBuilding> = new Map();
  private container: Phaser.GameObjects.Container;
  private colorSchemes: Map<BuildingType, BuildingColorScheme>;
  private isometricHeightScale = 0.5; // Isometric wall height multiplier

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create a container to hold all building graphics
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1); // Buildings render below most game objects

    // Initialize color schemes based on CJS2026 brand colors
    this.colorSchemes = this.initializeColorSchemes();
  }

  /**
   * Initialize color schemes for different building types
   */
  private initializeColorSchemes(): Map<BuildingType, BuildingColorScheme> {
    const schemes = new Map<BuildingType, BuildingColorScheme>();

    // CJS2026 brand colors
    const teal = 0x2a9d8f; // Primary
    const cream = 0xf5f0e6;
    const ink = 0x2c3e50;
    const parchment = 0xf0ebe0;

    // Commercial (teal - default)
    schemes.set(BuildingType.COMMERCIAL, {
      floor: teal,
      floorAlpha: 0.4,
      wall: 0x217a70, // Darker teal
      wallAlpha: 0.6,
      stroke: ink,
      strokeAlpha: 0.8,
      highlight: 0x3dc2b0, // Lighter teal
    });

    // Residential (warm beige)
    schemes.set(BuildingType.RESIDENTIAL, {
      floor: 0xe9c46a,
      floorAlpha: 0.4,
      wall: 0xc49b4d,
      wallAlpha: 0.6,
      stroke: ink,
      strokeAlpha: 0.8,
      highlight: 0xf4d58d,
    });

    // Hotel (purple)
    schemes.set(BuildingType.HOTEL, {
      floor: 0x9b59b6,
      floorAlpha: 0.4,
      wall: 0x7d3c98,
      wallAlpha: 0.6,
      stroke: ink,
      strokeAlpha: 0.8,
      highlight: 0xbb6bd9,
    });

    // Restaurant (red/orange)
    schemes.set(BuildingType.RESTAURANT, {
      floor: 0xe76f51,
      floorAlpha: 0.4,
      wall: 0xc8563d,
      wallAlpha: 0.6,
      stroke: ink,
      strokeAlpha: 0.8,
      highlight: 0xf4896d,
    });

    // Office (blue-gray)
    schemes.set(BuildingType.OFFICE, {
      floor: 0x5d737e,
      floorAlpha: 0.4,
      wall: 0x475a64,
      wallAlpha: 0.6,
      stroke: ink,
      strokeAlpha: 0.8,
      highlight: 0x7b95a3,
    });

    // Retail (pink)
    schemes.set(BuildingType.RETAIL, {
      floor: 0xf4a261,
      floorAlpha: 0.4,
      wall: 0xcf8449,
      wallAlpha: 0.6,
      stroke: ink,
      strokeAlpha: 0.8,
      highlight: 0xf7b883,
    });

    // Cultural (gold)
    schemes.set(BuildingType.CULTURAL, {
      floor: 0xdaa520,
      floorAlpha: 0.4,
      wall: 0xb8860b,
      wallAlpha: 0.6,
      stroke: ink,
      strokeAlpha: 0.8,
      highlight: 0xffd700,
    });

    // Industrial (gray)
    schemes.set(BuildingType.INDUSTRIAL, {
      floor: 0x8d99ae,
      floorAlpha: 0.4,
      wall: 0x6e788f,
      wallAlpha: 0.6,
      stroke: ink,
      strokeAlpha: 0.8,
      highlight: 0xa8b5cc,
    });

    // Park (green)
    schemes.set(BuildingType.PARK, {
      floor: 0x52b788,
      floorAlpha: 0.3,
      wall: 0x3d8a66,
      wallAlpha: 0.5,
      stroke: 0x2d6a4f,
      strokeAlpha: 0.7,
      highlight: 0x74c69d,
    });

    // Parking (light gray)
    schemes.set(BuildingType.PARKING, {
      floor: parchment,
      floorAlpha: 0.3,
      wall: 0xd4cbb8,
      wallAlpha: 0.5,
      stroke: ink,
      strokeAlpha: 0.6,
      highlight: cream,
    });

    return schemes;
  }

  /**
   * Get color scheme for a building type
   */
  private getColorScheme(type: BuildingType): BuildingColorScheme {
    return (
      this.colorSchemes.get(type) ||
      this.colorSchemes.get(BuildingType.COMMERCIAL)!
    );
  }

  /**
   * Add a single building to render
   */
  public addBuilding(building: BuildingData): void {
    // Check if building already exists
    if (this.buildings.has(building.id)) {
      console.warn(
        `Building with id ${building.id} already exists. Updating instead.`
      );
      this.removeBuilding(building.id);
    }

    // Render the building
    const rendered = this.renderBuilding(building);

    // Add to registry
    this.buildings.set(building.id, rendered);
  }

  /**
   * Add multiple buildings at once
   */
  public addBuildings(buildings: BuildingData[]): void {
    buildings.forEach((building) => this.addBuilding(building));
  }

  /**
   * Render a single building and return the rendered instance
   */
  public renderBuilding(building: BuildingData): RenderedBuilding {
    const colorScheme = this.getColorScheme(building.type);
    const height = building.height || 10; // Default height in meters
    const isometricHeight = height * this.isometricHeightScale;

    // Create graphics for floor (base footprint)
    const floor = this.scene.add.graphics();

    // Create graphics for walls (3D effect)
    const walls = this.scene.add.graphics();

    // Calculate bounds for culling and hit testing
    const bounds = this.calculateBounds(building.footprint);

    // Render walls first (for proper depth sorting)
    this.renderWalls(walls, building.footprint, isometricHeight, colorScheme);

    // Render floor on top
    this.renderFloor(floor, building.footprint, colorScheme);

    // Set depth based on Y position + height for proper sorting
    const depthValue = bounds.centerY + isometricHeight;
    floor.setDepth(depthValue);
    walls.setDepth(depthValue - 0.1); // Walls slightly behind floor

    // Add to container
    this.container.add(walls);
    this.container.add(floor);

    // Setup interactivity if requested
    const interactive = building.interactive !== false; // Default to true
    if (interactive) {
      this.setupInteractivity(floor, building);
    }

    return {
      data: building,
      floor,
      walls,
      bounds,
      visible: true,
      highlighted: false,
    };
  }

  /**
   * Render the floor (base footprint) as a filled polygon
   */
  private renderFloor(
    graphics: Phaser.GameObjects.Graphics,
    footprint: Array<{ x: number; y: number }>,
    colorScheme: BuildingColorScheme
  ): void {
    graphics.clear();

    // Fill
    graphics.fillStyle(colorScheme.floor, colorScheme.floorAlpha);
    graphics.beginPath();
    graphics.moveTo(footprint[0].x, footprint[0].y);
    for (let i = 1; i < footprint.length; i++) {
      graphics.lineTo(footprint[i].x, footprint[i].y);
    }
    graphics.closePath();
    graphics.fillPath();

    // Stroke (outline)
    graphics.lineStyle(2, colorScheme.stroke, colorScheme.strokeAlpha);
    graphics.strokePath();
  }

  /**
   * Render walls for isometric 3D effect
   * Draws vertical "walls" from each edge downward
   */
  private renderWalls(
    graphics: Phaser.GameObjects.Graphics,
    footprint: Array<{ x: number; y: number }>,
    height: number,
    colorScheme: BuildingColorScheme
  ): void {
    graphics.clear();

    // Draw walls for each edge of the polygon
    // Only draw walls on edges that face "down" and "right" (south and east)
    // to create isometric appearance
    for (let i = 0; i < footprint.length; i++) {
      const p1 = footprint[i];
      const p2 = footprint[(i + 1) % footprint.length];

      // Calculate edge direction
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      // Only draw walls for south-facing (dy > 0) and east-facing (dx > 0) edges
      // This creates the classic isometric 3D effect
      if (dy > 0 || dx > 0) {
        // Fill wall
        graphics.fillStyle(colorScheme.wall, colorScheme.wallAlpha);
        graphics.beginPath();
        graphics.moveTo(p1.x, p1.y);
        graphics.lineTo(p2.x, p2.y);
        graphics.lineTo(p2.x, p2.y + height);
        graphics.lineTo(p1.x, p1.y + height);
        graphics.closePath();
        graphics.fillPath();

        // Stroke wall edges
        graphics.lineStyle(1, colorScheme.stroke, colorScheme.strokeAlpha * 0.6);
        graphics.strokePath();
      }
    }
  }

  /**
   * Setup interactivity for a building (hover and click)
   */
  private setupInteractivity(
    graphics: Phaser.GameObjects.Graphics,
    building: BuildingData
  ): void {
    // Convert footprint to hit area polygon
    const hitArea = new Phaser.Geom.Polygon(
      building.footprint.flatMap((p) => [p.x, p.y])
    );

    graphics.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
    graphics.on('pointerover', () => {
      this.setHighlight(building.id, true);
      this.scene.input.setDefaultCursor('pointer');
    });

    graphics.on('pointerout', () => {
      this.setHighlight(building.id, false);
      this.scene.input.setDefaultCursor('default');
    });

    graphics.on('pointerdown', () => {
      this.handleBuildingClick(building);
    });
  }

  /**
   * Handle building click event
   */
  private handleBuildingClick(building: BuildingData): void {
    // Emit event to EventBus for React components to handle
    // This follows the same pattern as POI clicks
    console.log('[BuildingRenderer] Building clicked:', building.id, building.name);

    // You can import and use eventBus here if needed
    // import { eventBus } from '../../lib/EventBus';
    // eventBus.emit('building-selected', { buildingId: building.id, data: building });
  }

  /**
   * Set highlight state for a building (hover effect)
   */
  public setHighlight(buildingId: string, highlighted: boolean): void {
    const rendered = this.buildings.get(buildingId);
    if (!rendered || rendered.highlighted === highlighted) {
      return;
    }

    rendered.highlighted = highlighted;
    const colorScheme = this.getColorScheme(rendered.data.type);

    // Re-render floor with highlight effect
    const highlightScheme = highlighted
      ? {
          ...colorScheme,
          floor: colorScheme.highlight,
          floorAlpha: colorScheme.floorAlpha + 0.2,
        }
      : colorScheme;

    this.renderFloor(rendered.floor, rendered.data.footprint, highlightScheme);

    // Optionally add a scale effect
    if (highlighted) {
      this.scene.tweens.add({
        targets: [rendered.floor, rendered.walls],
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 200,
        ease: 'Quad.easeOut',
      });
    } else {
      this.scene.tweens.add({
        targets: [rendered.floor, rendered.walls],
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 200,
        ease: 'Quad.easeOut',
      });
    }
  }

  /**
   * Calculate bounding rectangle for a footprint polygon
   */
  private calculateBounds(
    footprint: Array<{ x: number; y: number }>
  ): Phaser.Geom.Rectangle {
    if (footprint.length === 0) {
      return new Phaser.Geom.Rectangle(0, 0, 0, 0);
    }

    let minX = footprint[0].x;
    let maxX = footprint[0].x;
    let minY = footprint[0].y;
    let maxY = footprint[0].y;

    for (let i = 1; i < footprint.length; i++) {
      minX = Math.min(minX, footprint[i].x);
      maxX = Math.max(maxX, footprint[i].x);
      minY = Math.min(minY, footprint[i].y);
      maxY = Math.max(maxY, footprint[i].y);
    }

    return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Update visibility based on camera viewport (culling)
   * Call this in scene's update() method for performance optimization
   */
  public updateVisibility(viewBounds: Phaser.Geom.Rectangle): void {
    this.buildings.forEach((rendered) => {
      // Check if building bounds intersect with view bounds
      const isVisible = Phaser.Geom.Intersects.RectangleToRectangle(
        rendered.bounds,
        viewBounds
      );

      // Only update if visibility changed
      if (rendered.visible !== isVisible) {
        rendered.visible = isVisible;
        rendered.floor.setVisible(isVisible);
        rendered.walls.setVisible(isVisible);
      }
    });
  }

  /**
   * Get building at a specific world position (hit testing)
   */
  public getBuildingAt(x: number, y: number): BuildingData | null {
    // Iterate through buildings in reverse depth order (front to back)
    const buildingsArray = Array.from(this.buildings.values());
    buildingsArray.sort((a, b) => b.floor.depth - a.floor.depth);

    for (const rendered of buildingsArray) {
      if (!rendered.visible) {
        continue;
      }

      // Check if point is within building footprint
      const polygon = new Phaser.Geom.Polygon(
        rendered.data.footprint.flatMap((p) => [p.x, p.y])
      );

      if (Phaser.Geom.Polygon.Contains(polygon, x, y)) {
        return rendered.data;
      }
    }

    return null;
  }

  /**
   * Remove a building by ID
   */
  public removeBuilding(id: string): boolean {
    const rendered = this.buildings.get(id);
    if (!rendered) {
      return false;
    }

    // Destroy graphics objects
    rendered.floor.destroy();
    rendered.walls.destroy();

    // Remove from registry
    this.buildings.delete(id);

    return true;
  }

  /**
   * Clear all buildings
   */
  public clearAll(): void {
    this.buildings.forEach((rendered) => {
      rendered.floor.destroy();
      rendered.walls.destroy();
    });
    this.buildings.clear();
  }

  /**
   * Get all building data
   */
  public getAllBuildings(): BuildingData[] {
    return Array.from(this.buildings.values()).map((rendered) => rendered.data);
  }

  /**
   * Get building by ID
   */
  public getBuilding(id: string): BuildingData | undefined {
    return this.buildings.get(id)?.data;
  }

  /**
   * Get buildings by type
   */
  public getBuildingsByType(type: BuildingType | BuildingType[]): BuildingData[] {
    const types = Array.isArray(type) ? type : [type];
    return this.getAllBuildings().filter((building) =>
      types.includes(building.type)
    );
  }

  /**
   * Get statistics about current buildings
   */
  public getStats(): {
    total: number;
    byType: Record<string, number>;
    visible: number;
    highlighted: number;
  } {
    const stats = {
      total: this.buildings.size,
      byType: {} as Record<string, number>,
      visible: 0,
      highlighted: 0,
    };

    this.buildings.forEach((rendered) => {
      // Count by type
      const type = rendered.data.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count visible
      if (rendered.visible) {
        stats.visible++;
      }

      // Count highlighted
      if (rendered.highlighted) {
        stats.highlighted++;
      }
    });

    return stats;
  }

  /**
   * Set isometric height scale (default 0.5)
   */
  public setIsometricHeightScale(scale: number): void {
    this.isometricHeightScale = scale;
  }

  /**
   * Cleanup and destroy the renderer
   */
  public destroy(): void {
    this.clearAll();
    this.container.destroy();
  }
}
