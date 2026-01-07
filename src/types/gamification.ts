/**
 * Gamification type definitions for Beat Street
 * Scavenger hunt system with check-ins, points, and leaderboard
 */

import { VenueId } from './venue';
import { Timestamp } from 'firebase/firestore';

/**
 * Type of hunt item
 */
export enum HuntItemType {
  SPONSOR = 'sponsor',
  SESSION = 'session',
  LANDMARK = 'landmark',
}

/**
 * Hunt item location data
 */
export interface HuntItemLocation {
  x: number;
  y: number;
  floor?: number;
  zone?: string;
  venueId: VenueId;
  mapId?: string; // 'outdoor' or indoor venue ID
}

/**
 * Hunt item definition
 */
export interface HuntItem {
  id: string;
  name: string;
  description: string;
  type: HuntItemType;
  points: number;
  location: HuntItemLocation;
  venueId: VenueId;
  poiId?: string; // Optional reference to POI if hunt item is linked to a POI
  metadata?: {
    company?: string; // For sponsor items
    speaker?: string; // For session items
    room?: string; // For session items
    photoOpportunity?: boolean; // For landmark items
    hint?: string; // Optional hint for finding the item
  };
  isActive?: boolean;
}

/**
 * Check-in method
 */
export enum CheckInMethod {
  QR = 'qr',
  TAP = 'tap',
  PROXIMITY = 'proximity',
}

/**
 * Single check-in record
 */
export interface CheckIn {
  itemId: string;
  timestamp: Timestamp | Date;
  method: CheckInMethod;
  location?: {
    x: number;
    y: number;
    zone: string;
  };
}

/**
 * User's scavenger hunt progress
 */
export interface HuntProgress {
  userId: string;
  venueId: VenueId;
  completedItems: CheckIn[];
  totalPoints: number;
  completedAt?: Timestamp | Date; // Set when all items are collected
  startedAt: Timestamp | Date;
  lastCheckInAt: Timestamp | Date;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalPoints: number;
  itemsCollected: number;
  completedAt?: Timestamp | Date;
  lastCheckInAt: Timestamp | Date;
  rank?: number;
}

/**
 * Points awarded for each type of hunt item
 */
export const HUNT_POINTS = {
  [HuntItemType.SPONSOR]: 10,
  [HuntItemType.SESSION]: 15,
  [HuntItemType.LANDMARK]: 5,
  COMPLETION_BONUS: 50,
} as const;

/**
 * Hunt statistics
 */
export interface HuntStats {
  totalItems: number;
  completedItems: number;
  totalPoints: number;
  possiblePoints: number;
  completionPercentage: number;
  byType: {
    [HuntItemType.SPONSOR]: { completed: number; total: number; points: number };
    [HuntItemType.SESSION]: { completed: number; total: number; points: number };
    [HuntItemType.LANDMARK]: { completed: number; total: number; points: number };
  };
  isCompleted: boolean;
}

/**
 * Proximity threshold for auto check-in (in pixels)
 */
export const PROXIMITY_THRESHOLD = 100;
