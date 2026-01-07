// Leaderboard Type definitions for Beat Street

import { Timestamp } from 'firebase/firestore';

/**
 * Represents a user's entry on the leaderboard
 */
export interface LeaderboardEntry {
  /** Firebase user ID (document ID) */
  uid: string;

  /** User's display name */
  displayName: string;

  /** Total points accumulated */
  points: number;

  /** Number of badges/achievements unlocked */
  badgeCount: number;

  /** Whether user has opted in to appear on public leaderboard */
  optedIn: boolean;

  /** When the entry was last updated */
  updatedAt: Timestamp | Date;

  /** User's current rank (1-based, calculated client-side) */
  rank?: number;

  /** Optional user photo URL */
  photoURL?: string;
}

/**
 * Configuration for leaderboard behavior
 */
export interface LeaderboardConfig {
  /** How often to refresh leaderboard data (ms) */
  refreshInterval: number;

  /** Maximum number of entries to fetch */
  maxEntries: number;

  /** Daily reset time (hour in 24h format, null for no reset) */
  resetTime: number | null;
}

/**
 * Time period for leaderboard filtering
 */
export enum LeaderboardPeriod {
  TODAY = 'today',
  ALL_TIME = 'all-time',
}

/**
 * User's rank and position info
 */
export interface UserRankInfo {
  /** User's current rank (1-based) */
  rank: number;

  /** Total points */
  points: number;

  /** Badge count */
  badgeCount: number;

  /** Whether opted in */
  optedIn: boolean;

  /** Points difference from next higher rank (null if rank 1) */
  pointsToNextRank: number | null;

  /** Points difference from next lower rank (null if last) */
  pointsFromPreviousRank: number | null;
}

/**
 * Leaderboard update payload
 */
export interface LeaderboardUpdate {
  /** Display name (optional, defaults to existing) */
  displayName?: string;

  /** Points to set (if provided) */
  points?: number;

  /** Badge count to set (if provided) */
  badgeCount?: number;

  /** Opt-in status */
  optedIn?: boolean;

  /** Photo URL */
  photoURL?: string;
}

/**
 * Leaderboard query options
 */
export interface LeaderboardQueryOptions {
  /** Number of entries to fetch */
  limit?: number;

  /** Time period filter */
  period?: LeaderboardPeriod;

  /** Minimum points threshold */
  minPoints?: number;
}

/**
 * Default leaderboard configuration
 */
export const DEFAULT_LEADERBOARD_CONFIG: LeaderboardConfig = {
  refreshInterval: 30000, // 30 seconds
  maxEntries: 100,
  resetTime: null, // No daily reset for all-time leaderboard
};
