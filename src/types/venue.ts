/**
 * Venue type definitions for Beat Street multi-venue support
 * Supports multiple CJS conference venues with indoor/outdoor maps
 */

/**
 * Available venue identifiers for CJS conferences
 */
export enum VenueId {
  CHAPEL_HILL = 'chapel-hill',
  PITTSBURGH = 'pittsburgh',
  PHILADELPHIA = 'philadelphia',
}

/**
 * Room configuration within a floor
 */
export interface RoomConfig {
  id: string;
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: number;
  type?: 'session' | 'exhibit' | 'networking' | 'food' | 'service';
}

/**
 * Floor configuration for indoor venues
 */
export interface FloorConfig {
  floor: number;
  name: string;
  mapPath: string; // Path to Tiled JSON
  worldBounds: {
    width: number;
    height: number;
  };
  spawnPoint: {
    x: number;
    y: number;
  };
  rooms?: RoomConfig[];
}

/**
 * Indoor venue configuration (buildings within a venue)
 */
export interface IndoorVenueConfig {
  id: string;
  name: string;
  displayName: string;
  floors: FloorConfig[];
  buildingPosition?: {
    x: number;
    y: number;
  };
}

/**
 * District configuration for outdoor maps
 */
export interface DistrictConfig {
  id: string;
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: number;
}

/**
 * Outdoor map configuration for a venue
 */
export interface OutdoorMapConfig {
  id: string;
  name: string;
  mapPath?: string;
  worldBounds: {
    width: number;
    height: number;
  };
  spawnPoint: {
    x: number;
    y: number;
  };
  districts?: DistrictConfig[];
  indoorVenues: IndoorVenueConfig[];
}

/**
 * Complete venue configuration
 */
export interface VenueConfig {
  id: VenueId;
  name: string;
  displayName: string;
  city: string;
  state: string;
  address?: string;
  dates: string;
  timezone: string;
  outdoorMap: OutdoorMapConfig;
  thumbnailUrl?: string;
  isDefault?: boolean;
}

/**
 * Current venue and map selection state
 */
export interface VenueSelectionState {
  selectedVenue: VenueId;
  currentMap: 'outdoor' | string; // 'outdoor' or indoor venue ID
  currentFloor?: number;
  currentZone: string;
}
