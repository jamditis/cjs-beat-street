// POI Type definitions for Beat Street

export enum POIType {
  SESSION = 'session',
  SPONSOR = 'sponsor',
  FOOD = 'food',
  LANDMARK = 'landmark',
  SOCIAL = 'social',
  INFO = 'info',
}

export interface POIPosition {
  x: number;
  y: number;
  floor?: number;
  zone?: string;
}

export interface POIData {
  id: string;
  type: POIType;
  name: string;
  description?: string;
  position: POIPosition;
  floor?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  isPulsing?: boolean;
}

export interface SessionPOI extends POIData {
  type: POIType.SESSION;
  metadata: {
    startTime: string;
    endTime: string;
    speaker?: string;
    room?: string;
    track?: string;
    capacity?: number;
    attendeeCount?: number;
  };
}

export interface SponsorPOI extends POIData {
  type: POIType.SPONSOR;
  metadata: {
    company: string;
    logoUrl?: string;
    booth?: string;
    category?: string;
    representatives?: string[];
    website?: string;
  };
}

export interface FoodPOI extends POIData {
  type: POIType.FOOD;
  metadata: {
    menuType?: string;
    dietaryOptions?: string[];
    hours?: string;
    capacity?: number;
  };
}

export interface SocialPOI extends POIData {
  type: POIType.SOCIAL;
  metadata: {
    capacity?: number;
    currentOccupancy?: number;
    amenities?: string[];
  };
}

export interface InfoPOI extends POIData {
  type: POIType.INFO;
  metadata: {
    services?: string[];
    hours?: string;
  };
}

export interface LandmarkPOI extends POIData {
  type: POIType.LANDMARK;
  metadata: {
    historicalInfo?: string;
    photoOpportunity?: boolean;
  };
}

export type TypedPOI =
  | SessionPOI
  | SponsorPOI
  | FoodPOI
  | SocialPOI
  | InfoPOI
  | LandmarkPOI;

export interface POIInteraction {
  poiId: string;
  poiData: POIData;
  timestamp: number;
  interactionType: 'click' | 'hover' | 'proximity';
}

export interface POIFilter {
  type?: POIType | POIType[];
  floor?: number;
  zone?: string;
  isActive?: boolean;
  maxDistance?: number;
  fromPosition?: { x: number; y: number };
}

export interface POIConfig {
  scene: Phaser.Scene;
  data: POIData;
  showLabel?: boolean;
  showDistance?: boolean;
  interactive?: boolean;
  scale?: number;
}
