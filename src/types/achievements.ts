// Achievement badge type definitions for Beat Street

import { Timestamp } from 'firebase/firestore';

/**
 * Badge category classification
 */
export enum BadgeCategory {
  EXPLORATION = 'exploration',
  ENGAGEMENT = 'engagement',
  SOCIAL = 'social',
  COMPETITIVE = 'competitive',
  ACHIEVEMENT = 'achievement',
}

/**
 * Action types that can trigger badge progress
 */
export enum BadgeAction {
  DISTRICT_VISITED = 'district-visited',
  SESSION_ATTENDED = 'session-attended',
  PROFILE_VIEWED = 'profile-viewed',
  SCAVENGER_HUNT_COMPLETED = 'scavenger-hunt-completed',
  POINTS_EARNED = 'points-earned',
}

/**
 * Requirement type for badge unlocking
 */
export interface BadgeRequirement {
  action: BadgeAction;
  targetValue: number;
  description: string;
}

/**
 * Badge definition
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon identifier (compass, book, people, flag, trophy)
  category: BadgeCategory;
  requirement: BadgeRequirement;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

/**
 * Progress toward unlocking a specific badge
 */
export interface BadgeProgress {
  badgeId: string;
  currentValue: number;
  targetValue: number;
  unlockedAt?: Timestamp | Date;
  lastUpdated: Timestamp | Date;
}

/**
 * User achievement data stored in Firestore
 */
export interface UserAchievements {
  userId: string;
  badges: BadgeProgress[];
  totalBadges: number;
  totalPoints: number;
  districts?: string[]; // List of visited district IDs
  sessionsAttended?: string[]; // List of attended session POI IDs
  profilesViewed?: string[]; // List of viewed user UIDs
  scavengerHuntCompleted?: boolean;
  lastUpdated: Timestamp | Date;
}

/**
 * Badge unlock event data
 */
export interface BadgeUnlockEvent {
  badgeId: string;
  badge: Badge;
  userId: string;
  timestamp: number;
}

/**
 * Action data for badge progress tracking
 */
export interface BadgeActionData {
  districtId?: string;
  sessionId?: string;
  profileUid?: string;
  points?: number;
  scavengerHuntComplete?: boolean;
}
