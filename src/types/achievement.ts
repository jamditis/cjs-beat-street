/**
 * Achievement and gamification type definitions for Beat Street
 */

/**
 * Achievement categories for organizing badges
 */
export type AchievementCategory = 'exploration' | 'networking' | 'sessions' | 'sponsors';

/**
 * Types of requirements that can trigger achievement unlocks
 */
export type AchievementRequirementType =
  | 'visit_poi'
  | 'visit_pois'
  | 'attend_session'
  | 'attend_sessions'
  | 'meet_attendees'
  | 'visit_count'
  | 'visit_zone'
  | 'visit_all_sponsors'
  | 'visit_all_coffee_shops'
  | 'time_based';

/**
 * Achievement requirement definition
 */
export interface AchievementRequirement {
  /** Type of requirement */
  type: AchievementRequirementType;
  /** Target POI ID, session ID, zone name, or numeric count */
  target?: string | number;
  /** Array of specific targets (for visit_pois type) */
  targets?: string[];
  /** Count required (for visit_count, attend_sessions, meet_attendees) */
  count?: number;
  /** Time constraint (ISO string for time_based requirements) */
  beforeTime?: string;
  afterTime?: string;
}

/**
 * Achievement definition
 */
export interface Achievement {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description shown to users */
  description: string;
  /** Icon identifier (maps to UI asset) */
  icon: string;
  /** Category for grouping */
  category: AchievementCategory;
  /** Points awarded for unlocking */
  points: number;
  /** Requirements to unlock */
  requirement: AchievementRequirement;
  /** Optional hint shown when locked */
  hint?: string;
  /** Whether this achievement is hidden until unlocked */
  secret?: boolean;
}

/**
 * Unlocked achievement record with timestamp
 */
export interface UnlockedAchievement {
  /** Achievement ID */
  achievementId: string;
  /** When the achievement was unlocked */
  unlockedAt: Date;
}

/**
 * User progress tracking for achievements
 */
export interface UserProgress {
  /** User ID */
  uid: string;
  /** List of unlocked achievement IDs */
  unlockedAchievements: string[];
  /** Detailed unlock records with timestamps */
  achievementRecords: UnlockedAchievement[];
  /** Total points earned */
  totalPoints: number;
  /** Set of visited POI IDs */
  visitedPOIs: string[];
  /** Set of attended session IDs */
  attendedSessions: string[];
  /** Set of connected user IDs (networking) */
  connections: string[];
  /** Set of visited zone names */
  visitedZones: string[];
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Achievement unlock event payload for EventBus
 */
export interface AchievementUnlockEvent {
  /** The unlocked achievement */
  achievement: Achievement;
  /** User's updated total points */
  totalPoints: number;
  /** Timestamp of unlock */
  unlockedAt: Date;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  /** User ID */
  uid: string;
  /** Display name */
  displayName: string;
  /** Total points */
  totalPoints: number;
  /** Number of achievements unlocked */
  achievementCount: number;
  /** Rank position (1-based) */
  rank: number;
}

/**
 * Achievement progress for partial completion tracking
 */
export interface AchievementProgress {
  /** Achievement ID */
  achievementId: string;
  /** Current progress count */
  current: number;
  /** Target count required */
  target: number;
  /** Progress percentage (0-100) */
  percentage: number;
}
