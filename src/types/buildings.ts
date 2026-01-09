/**
 * Building Footprint Type Definitions for Beat Street
 *
 * Defines types for loading, transforming, and rendering building footprints
 * from OpenStreetMap (OSM) GeoJSON data onto the isometric game map.
 */

/**
 * Geographic coordinates (latitude/longitude)
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Game world coordinates (pixels in game space)
 */
export interface GameCoord {
  x: number;
  y: number;
}

/**
 * Isometric coordinates (2:1 perspective)
 */
export interface IsoCoord {
  x: number;
  y: number;
}

/**
 * Building types based on OpenStreetMap building tags
 */
export type BuildingType =
  | 'commercial'
  | 'residential'
  | 'hotel'
  | 'restaurant'
  | 'university'
  | 'convention_center'
  | 'retail'
  | 'office'
  | 'parking'
  | 'industrial'
  | 'public'
  | 'unknown';

/**
 * Main building data structure
 */
export interface BuildingData {
  /** Unique building identifier (from OSM or generated) */
  id: string;
  /** Building name if available */
  name?: string;
  /** Building classification */
  type: BuildingType;
  /** Polygon vertices in game coordinates */
  coordinates: GameCoord[];
  /** Original lat/lng coordinates for reference */
  originalCoords?: [number, number][];
  /** Height in game units */
  height: number;
  /** Number of floors/levels */
  levels?: number;
  /** Building area in square meters */
  area?: number;
  /** Raw OpenStreetMap properties */
  properties?: Record<string, unknown>;
}

/**
 * Configuration for coordinate transformation
 */
export interface TransformerConfig {
  /** Origin point for lat/lng to game coordinate conversion */
  origin: LatLng;
  /** Scale factor: meters to pixels */
  metersToPixels: number;
  /** Tile width for isometric conversion */
  tileWidth: number;
  /** Tile height for isometric conversion */
  tileHeight: number;
}

/**
 * Configuration for GeoJSON loading and processing
 */
export interface GeoJSONLoaderConfig {
  /** Default building height when not specified in OSM data */
  defaultHeight: number;
  /** Average meters per building level/floor */
  metersPerLevel: number;
  /** Tolerance for polygon simplification (Douglas-Peucker) */
  simplifyTolerance: number;
}

/**
 * Bounding box for spatial queries
 */
export interface Bounds {
  /** Minimum X coordinate */
  minX: number;
  /** Minimum Y coordinate */
  minY: number;
  /** Maximum X coordinate */
  maxX: number;
  /** Maximum Y coordinate */
  maxY: number;
}

/**
 * Visual styling for building rendering
 */
export interface BuildingStyle {
  /** Fill color (hex number) */
  fillColor: number;
  /** Fill opacity (0.0 - 1.0) */
  fillAlpha: number;
  /** Stroke/outline color (hex number) */
  strokeColor: number;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Wall/side face color (hex number) */
  wallColor: number;
}

/**
 * Configuration for building renderer
 */
export interface BuildingRendererConfig {
  /** Default style applied to all buildings */
  defaultStyle: BuildingStyle;
  /** Type-specific style overrides */
  typeStyles: Partial<Record<BuildingType, Partial<BuildingStyle>>>;
  /** Whether to render building shadows */
  enableShadows: boolean;
  /** Shadow offset from building base */
  shadowOffset: { x: number; y: number };
}

/**
 * Maps OpenStreetMap building tags to BuildingType enum
 *
 * @param tag - The OSM building tag value
 * @returns Classified BuildingType
 *
 * @example
 * osmTagToBuildingType('hotel') // returns 'hotel'
 * osmTagToBuildingType('apartments') // returns 'residential'
 * osmTagToBuildingType('yes') // returns 'unknown'
 */
export function osmTagToBuildingType(tag: string): BuildingType {
  const normalized = tag.toLowerCase().trim();

  // Direct matches
  switch (normalized) {
    case 'hotel':
    case 'motel':
      return 'hotel';

    case 'restaurant':
    case 'cafe':
    case 'fast_food':
      return 'restaurant';

    case 'university':
    case 'college':
    case 'school':
      return 'university';

    case 'convention_center':
    case 'conference_center':
    case 'events_venue':
      return 'convention_center';

    case 'retail':
    case 'shop':
    case 'store':
    case 'supermarket':
    case 'mall':
      return 'retail';

    case 'office':
    case 'offices':
    case 'commercial':
      return 'office';

    case 'parking':
    case 'parking_garage':
    case 'garage':
      return 'parking';

    case 'industrial':
    case 'warehouse':
    case 'factory':
      return 'industrial';

    case 'public':
    case 'civic':
    case 'government':
    case 'town_hall':
      return 'public';

    case 'residential':
    case 'apartments':
    case 'house':
    case 'houses':
    case 'detached':
    case 'semidetached_house':
    case 'terrace':
      return 'residential';

    default:
      // Check for partial matches
      if (normalized.includes('hotel') || normalized.includes('motel')) {
        return 'hotel';
      }
      if (
        normalized.includes('restaurant') ||
        normalized.includes('cafe') ||
        normalized.includes('food')
      ) {
        return 'restaurant';
      }
      if (
        normalized.includes('retail') ||
        normalized.includes('shop') ||
        normalized.includes('store')
      ) {
        return 'retail';
      }
      if (normalized.includes('office') || normalized.includes('commercial')) {
        return 'office';
      }
      if (normalized.includes('residential') || normalized.includes('apartment')) {
        return 'residential';
      }
      if (normalized.includes('parking') || normalized.includes('garage')) {
        return 'parking';
      }
      if (normalized.includes('industrial') || normalized.includes('warehouse')) {
        return 'industrial';
      }
      if (
        normalized.includes('university') ||
        normalized.includes('college') ||
        normalized.includes('school')
      ) {
        return 'university';
      }
      if (
        normalized.includes('public') ||
        normalized.includes('civic') ||
        normalized.includes('government')
      ) {
        return 'public';
      }

      return 'unknown';
  }
}
