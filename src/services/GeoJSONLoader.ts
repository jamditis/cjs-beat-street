/**
 * GeoJSON Loader Service
 *
 * Loads and processes building footprint data from GeoJSON files for use in the isometric game.
 * Supports both OpenStreetMap-style attributes and Microsoft building footprint data.
 */

/**
 * GeoJSON type definitions (inline to avoid external dependencies)
 */
namespace GeoJSON {
  export interface Feature {
    type: 'Feature';
    id?: string | number;
    geometry: Geometry;
    properties: Record<string, unknown> | null;
  }

  export interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }

  export interface Geometry {
    type: string;
  }

  export interface Polygon extends Geometry {
    type: 'Polygon';
    coordinates: number[][][];
  }
}

export interface BuildingData {
  id: string;
  coordinates: number[][][]; // GeoJSON Polygon coordinates [[[lon, lat], ...]]
  height?: number; // Height in meters
  levels?: number; // Number of building levels/floors
  type?: string; // Building type (residential, commercial, etc.)
  name?: string; // Building name
  centroid: { x: number; y: number }; // Calculated centroid for positioning
}

export interface GeoJSONLoaderConfig {
  defaultHeight?: number; // Default building height in meters (default: 10)
  defaultLevels?: number; // Default number of levels (default: 3)
  metersPerLevel?: number; // Height per level in meters (default: 3.5)
  simplifyTolerance?: number; // Douglas-Peucker tolerance for polygon simplification (default: 0.00001)
  autoSimplify?: boolean; // Automatically simplify loaded polygons (default: false)
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * GeoJSON Loader for building footprint data
 * Parses GeoJSON FeatureCollections and extracts building information
 */
export class GeoJSONLoader {
  private config: Required<GeoJSONLoaderConfig>;

  constructor(config: GeoJSONLoaderConfig = {}) {
    this.config = {
      defaultHeight: config.defaultHeight ?? 10,
      defaultLevels: config.defaultLevels ?? 3,
      metersPerLevel: config.metersPerLevel ?? 3.5,
      simplifyTolerance: config.simplifyTolerance ?? 0.00001,
      autoSimplify: config.autoSimplify ?? false,
    };
  }

  /**
   * Load building data from a GeoJSON file
   * @param path Path to the GeoJSON file (relative to public directory or absolute URL)
   * @returns Promise resolving to array of BuildingData
   */
  async loadFromFile(path: string): Promise<BuildingData[]> {
    try {
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`Failed to fetch GeoJSON: ${response.status} ${response.statusText}`);
      }

      const geojson = await response.json();

      if (!this.isFeatureCollection(geojson)) {
        throw new Error('Invalid GeoJSON: Expected FeatureCollection');
      }

      return this.loadFromGeoJSON(geojson);
    } catch (error) {
      console.error('[GeoJSONLoader] Failed to load from file:', error);
      throw error;
    }
  }

  /**
   * Parse building data directly from a GeoJSON FeatureCollection
   * @param geojson GeoJSON FeatureCollection containing building polygons
   * @returns Array of BuildingData
   */
  loadFromGeoJSON(geojson: GeoJSON.FeatureCollection): BuildingData[] {
    const buildings: BuildingData[] = [];

    for (let i = 0; i < geojson.features.length; i++) {
      const feature = geojson.features[i];

      if (!feature.geometry || feature.geometry.type !== 'Polygon') {
        continue;
      }

      try {
        const building = this.parseBuilding(feature, i);
        buildings.push(building);
      } catch (error) {
        console.warn(`[GeoJSONLoader] Failed to parse building at index ${i}:`, error);
      }
    }

    console.log(`[GeoJSONLoader] Loaded ${buildings.length} buildings from GeoJSON`);
    return buildings;
  }

  /**
   * Filter buildings by bounding box
   * @param buildings Array of BuildingData to filter
   * @param bounds Bounding box { minX, minY, maxX, maxY } in the same coordinate system
   * @returns Filtered array of buildings whose centroids fall within bounds
   */
  filterByBounds(buildings: BuildingData[], bounds: Bounds): BuildingData[] {
    return buildings.filter(building => {
      const { x, y } = building.centroid;
      return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
    });
  }

  /**
   * Simplify polygon using Douglas-Peucker algorithm
   * Reduces the number of points while preserving the general shape
   * @param coords Polygon coordinates [[lon, lat], ...]
   * @param tolerance Simplification tolerance (default from config)
   * @returns Simplified polygon coordinates
   */
  simplifyPolygon(coords: number[][], tolerance?: number): number[][] {
    const tol = tolerance ?? this.config.simplifyTolerance;

    if (coords.length < 3) {
      return coords;
    }

    // Convert to Point objects for easier calculations
    const points: Point[] = coords.map(([x, y]) => ({ x, y }));

    // Douglas-Peucker algorithm
    const simplified = this.douglasPeucker(points, tol);

    // Convert back to coordinate format
    return simplified.map(p => [p.x, p.y]);
  }

  /**
   * Parse a single GeoJSON feature into BuildingData
   */
  private parseBuilding(feature: GeoJSON.Feature, index: number): BuildingData {
    const geometry = feature.geometry as GeoJSON.Polygon;
    const props = feature.properties || {};

    // Extract building ID (use feature id, properties.id, or generate one)
    const id = feature.id?.toString() || props.id?.toString() || `building_${index}`;

    // Extract building attributes
    const name = this.extractName(props);
    const type = this.extractType(props);
    const levels = this.extractLevels(props);
    const height = this.extractHeight(props, levels);

    // Get coordinates and apply simplification if enabled
    let coordinates = geometry.coordinates as number[][][];
    if (this.config.autoSimplify) {
      const simplifiedRings: number[][][] = [];
      for (const ring of coordinates) {
        simplifiedRings.push(this.simplifyPolygon(ring));
      }
      coordinates = simplifiedRings;
    }

    // Calculate centroid for positioning
    const centroid = this.calculateCentroid(coordinates[0]);

    return {
      id,
      coordinates,
      height,
      levels,
      type,
      name,
      centroid,
    };
  }

  /**
   * Extract building name from properties
   * Checks multiple common property names
   */
  private extractName(props: Record<string, unknown>): string | undefined {
    const nameFields = ['name', 'Name', 'NAME', 'building_name', 'addr:housename'];

    for (const field of nameFields) {
      if (props[field] && typeof props[field] === 'string') {
        return props[field] as string;
      }
    }

    return undefined;
  }

  /**
   * Extract building type from properties
   * Handles OSM 'building' tag and other type fields
   */
  private extractType(props: Record<string, unknown>): string | undefined {
    const typeFields = ['building', 'building:type', 'type', 'amenity', 'landuse'];

    for (const field of typeFields) {
      if (props[field] && typeof props[field] === 'string') {
        const value = props[field] as string;
        // Skip generic 'yes' value from OSM
        if (value !== 'yes') {
          return value;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract number of building levels from properties
   */
  private extractLevels(props: Record<string, unknown>): number | undefined {
    const levelFields = ['building:levels', 'levels', 'building:floors', 'floors', 'stories'];

    for (const field of levelFields) {
      if (props[field]) {
        const value = props[field];
        if (typeof value === 'number') {
          return Math.max(1, Math.floor(value));
        }
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed) && parsed > 0) {
            return Math.max(1, Math.floor(parsed));
          }
        }
      }
    }

    return this.config.defaultLevels;
  }

  /**
   * Extract building height from properties
   * If not available, calculates from levels
   */
  private extractHeight(props: Record<string, unknown>, levels?: number): number {
    const heightFields = ['height', 'building:height', 'Height'];

    for (const field of heightFields) {
      if (props[field]) {
        const value = props[field];
        if (typeof value === 'number') {
          return Math.max(1, value);
        }
        if (typeof value === 'string') {
          // Parse height string (may include units like "10m" or "10 m")
          const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
          if (!isNaN(parsed) && parsed > 0) {
            return Math.max(1, parsed);
          }
        }
      }
    }

    // Calculate height from levels if available
    if (levels && levels > 0) {
      return levels * this.config.metersPerLevel;
    }

    return this.config.defaultHeight;
  }

  /**
   * Calculate the centroid of a polygon
   * Uses the average of all vertices
   */
  private calculateCentroid(ring: number[][]): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    const count = ring.length;

    for (const [x, y] of ring) {
      sumX += x;
      sumY += y;
    }

    return {
      x: sumX / count,
      y: sumY / count,
    };
  }

  /**
   * Douglas-Peucker algorithm for polygon simplification
   * Recursively removes points that don't contribute significantly to the shape
   */
  private douglasPeucker(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) {
      return points;
    }

    // Find the point with maximum distance from the line segment
    let maxDistance = 0;
    let maxIndex = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const distance = this.perpendicularDistance(points[i], points[0], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      // Recursive call on both segments
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);

      // Concatenate results (remove duplicate middle point)
      return [...left.slice(0, -1), ...right];
    } else {
      // All points between start and end can be removed
      return [points[0], points[end]];
    }
  }

  /**
   * Calculate perpendicular distance from point to line segment
   * Used in Douglas-Peucker algorithm
   */
  private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    // Handle degenerate case where line segment is a point
    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
      );
    }

    // Calculate perpendicular distance using cross product
    const numerator = Math.abs(
      dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    );
    const denominator = Math.sqrt(dx * dx + dy * dy);

    return numerator / denominator;
  }

  /**
   * Type guard to check if object is a valid GeoJSON FeatureCollection
   */
  private isFeatureCollection(obj: unknown): obj is GeoJSON.FeatureCollection {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'type' in obj &&
      obj.type === 'FeatureCollection' &&
      'features' in obj &&
      Array.isArray(obj.features)
    );
  }
}

/**
 * Create a GeoJSONLoader instance with default configuration
 */
export function createGeoJSONLoader(config?: GeoJSONLoaderConfig): GeoJSONLoader {
  return new GeoJSONLoader(config);
}
