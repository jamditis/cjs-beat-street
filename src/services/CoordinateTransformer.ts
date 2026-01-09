/**
 * CoordinateTransformer service
 * Converts between WGS84 (lat/lng), Web Mercator, game world, and isometric screen coordinates
 *
 * Transformation pipeline:
 * 1. WGS84 (latitude, longitude) → Web Mercator (x, y in meters)
 * 2. Web Mercator → Game world coordinates (scaled game units)
 * 3. Game world → Isometric screen coordinates (2:1 ratio, 64x32 tiles)
 */

// Earth radius in meters for Web Mercator projection
const EARTH_RADIUS = 6378137;

/**
 * WGS84 coordinate (latitude, longitude in degrees)
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Game world coordinate (orthogonal x, y)
 */
export interface GameCoord {
  x: number;
  y: number;
}

/**
 * Isometric screen coordinate (x, y in pixels)
 */
export interface IsoCoord {
  x: number;
  y: number;
}

/**
 * Web Mercator coordinate (x, y in meters)
 */
export interface MercatorCoord {
  x: number;
  y: number;
}

/**
 * Configuration for coordinate transformation
 */
export interface TransformerConfig {
  /** Origin point in WGS84 (where game world 0,0 is located) */
  origin: LatLng;
  /** Scale factor: meters per game unit (e.g., 1.0 means 1 game unit = 1 meter) */
  metersPerGameUnit: number;
  /** Tile width in pixels (default: 64) */
  tileWidth?: number;
  /** Tile height in pixels (default: 32) */
  tileHeight?: number;
}

/**
 * CoordinateTransformer class
 * Handles all coordinate transformations for the game
 */
export class CoordinateTransformer {
  private readonly origin: LatLng;
  private readonly metersPerGameUnit: number;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  private readonly originMercator: MercatorCoord;

  constructor(config: TransformerConfig) {
    this.origin = config.origin;
    this.metersPerGameUnit = config.metersPerGameUnit;
    this.tileWidth = config.tileWidth ?? 64;
    this.tileHeight = config.tileHeight ?? 32;

    // Pre-calculate origin in Web Mercator for efficiency
    this.originMercator = this.latLngToMercator(this.origin);
  }

  /**
   * Convert WGS84 coordinates to Web Mercator projection
   * Uses standard Web Mercator formulas (EPSG:3857)
   *
   * @param coord - Latitude and longitude in degrees
   * @returns Web Mercator coordinates in meters
   */
  latLngToMercator(coord: LatLng): MercatorCoord {
    // Convert degrees to radians
    const latRad = (coord.lat * Math.PI) / 180;
    const lngRad = (coord.lng * Math.PI) / 180;

    // Web Mercator projection formulas
    // x = R * longitude (in radians)
    const x = EARTH_RADIUS * lngRad;

    // y = R * ln(tan(π/4 + latitude/2))
    const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + latRad / 2));

    return { x, y };
  }

  /**
   * Convert Web Mercator coordinates to game world coordinates
   * Translates by origin and scales by metersPerGameUnit
   *
   * @param mercator - Web Mercator coordinates in meters
   * @returns Game world coordinates
   */
  mercatorToGame(mercator: MercatorCoord): GameCoord {
    // Calculate offset from origin
    const deltaX = mercator.x - this.originMercator.x;
    const deltaY = mercator.y - this.originMercator.y;

    // Scale to game units
    // Note: Y is inverted because game Y increases downward, but Mercator Y increases upward
    const x = deltaX / this.metersPerGameUnit;
    const y = -deltaY / this.metersPerGameUnit;

    return { x, y };
  }

  /**
   * Convert game world coordinates to isometric screen coordinates
   * Uses 2:1 isometric projection (cartesian to diamond)
   *
   * @param game - Game world coordinates
   * @returns Isometric screen coordinates in pixels
   */
  gameToIsometric(game: GameCoord): IsoCoord {
    // Standard isometric transformation (2:1 ratio)
    // screenX = (worldX - worldY) * (tileWidth / 2)
    // screenY = (worldX + worldY) * (tileHeight / 2)
    const x = (game.x - game.y) * (this.tileWidth / 2);
    const y = (game.x + game.y) * (this.tileHeight / 2);

    return { x, y };
  }

  /**
   * Convert WGS84 coordinates directly to game world coordinates
   * Convenience method combining latLngToMercator and mercatorToGame
   *
   * @param coord - Latitude and longitude in degrees
   * @returns Game world coordinates
   */
  latLngToGame(coord: LatLng): GameCoord {
    const mercator = this.latLngToMercator(coord);
    return this.mercatorToGame(mercator);
  }

  /**
   * Convert WGS84 coordinates directly to isometric screen coordinates
   * Full transformation pipeline from lat/lng to screen pixels
   *
   * @param coord - Latitude and longitude in degrees
   * @returns Isometric screen coordinates in pixels
   */
  latLngToIsometric(coord: LatLng): IsoCoord {
    const game = this.latLngToGame(coord);
    return this.gameToIsometric(game);
  }

  /**
   * Transform a polygon from GeoJSON coordinates to game coordinates
   * Useful for converting venue boundaries, zones, etc.
   *
   * @param coords - Array of [longitude, latitude] pairs (GeoJSON format)
   * @returns Array of game world coordinates
   */
  transformPolygon(coords: [number, number][]): GameCoord[] {
    return coords.map(([lng, lat]) => this.latLngToGame({ lat, lng }));
  }

  /**
   * Convert isometric screen coordinates back to game world coordinates
   * Inverse of gameToIsometric
   *
   * @param iso - Isometric screen coordinates in pixels
   * @returns Game world coordinates
   */
  isometricToGame(iso: IsoCoord): GameCoord {
    // Inverse isometric transformation
    // worldX = (screenX / (tileWidth/2) + screenY / (tileHeight/2)) / 2
    // worldY = (screenY / (tileHeight/2) - screenX / (tileWidth/2)) / 2
    const x = iso.x / (this.tileWidth / 2);
    const y = iso.y / (this.tileHeight / 2);

    const gameX = (x + y) / 2;
    const gameY = (y - x) / 2;

    return { x: gameX, y: gameY };
  }

  /**
   * Convert game world coordinates back to Web Mercator
   * Inverse of mercatorToGame
   *
   * @param game - Game world coordinates
   * @returns Web Mercator coordinates in meters
   */
  gameToMercator(game: GameCoord): MercatorCoord {
    // Scale from game units to meters
    const deltaX = game.x * this.metersPerGameUnit;
    const deltaY = -game.y * this.metersPerGameUnit; // Invert Y back

    // Add origin offset
    const x = this.originMercator.x + deltaX;
    const y = this.originMercator.y + deltaY;

    return { x, y };
  }

  /**
   * Convert Web Mercator back to WGS84 coordinates
   * Inverse of latLngToMercator
   *
   * @param mercator - Web Mercator coordinates in meters
   * @returns Latitude and longitude in degrees
   */
  mercatorToLatLng(mercator: MercatorCoord): LatLng {
    // Inverse Web Mercator formulas
    const lng = (mercator.x / EARTH_RADIUS) * (180 / Math.PI);

    // lat = 2 * atan(e^(y/R)) - π/2
    const latRad = 2 * Math.atan(Math.exp(mercator.y / EARTH_RADIUS)) - Math.PI / 2;
    const lat = latRad * (180 / Math.PI);

    return { lat, lng };
  }

  /**
   * Convert game world coordinates back to WGS84
   * Full inverse transformation pipeline
   *
   * @param game - Game world coordinates
   * @returns Latitude and longitude in degrees
   */
  gameToLatLng(game: GameCoord): LatLng {
    const mercator = this.gameToMercator(game);
    return this.mercatorToLatLng(mercator);
  }

  /**
   * Calculate distance between two WGS84 points in meters
   * Uses Haversine formula for accuracy
   *
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns Distance in meters
   */
  calculateDistance(coord1: LatLng, coord2: LatLng): number {
    const lat1Rad = (coord1.lat * Math.PI) / 180;
    const lat2Rad = (coord2.lat * Math.PI) / 180;
    const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS * c;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<TransformerConfig> {
    return {
      origin: { ...this.origin },
      metersPerGameUnit: this.metersPerGameUnit,
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
    };
  }
}

/**
 * Create a default transformer for CJS2026 venue
 * Example origin: Portland Convention Center (approximate)
 */
export function createDefaultTransformer(): CoordinateTransformer {
  return new CoordinateTransformer({
    origin: {
      lat: 45.528516, // Portland Convention Center (approximate)
      lng: -122.663474,
    },
    metersPerGameUnit: 1.0, // 1 game unit = 1 meter
    tileWidth: 64,
    tileHeight: 32,
  });
}
