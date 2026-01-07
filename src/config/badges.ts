// Badge definitions for Beat Street achievement system

import { Badge, BadgeCategory, BadgeAction } from '../types/achievements';

/**
 * All available badges in the game
 * 5 core badges covering different aspects of conference engagement
 */
export const BADGES: Record<string, Badge> = {
  EXPLORER: {
    id: 'explorer',
    name: 'Explorer',
    description: 'Visit all 5 districts in the conference venue',
    icon: 'compass',
    category: BadgeCategory.EXPLORATION,
    requirement: {
      action: BadgeAction.DISTRICT_VISITED,
      targetValue: 5,
      description: 'Explore all 5 districts',
    },
    rarity: 'common',
  },

  KNOWLEDGE_SEEKER: {
    id: 'knowledge-seeker',
    name: 'Knowledge Seeker',
    description: 'Attend 5 conference sessions',
    icon: 'book',
    category: BadgeCategory.ENGAGEMENT,
    requirement: {
      action: BadgeAction.SESSION_ATTENDED,
      targetValue: 5,
      description: 'Attend 5 sessions',
    },
    rarity: 'common',
  },

  CONNECTOR: {
    id: 'connector',
    name: 'Connector',
    description: 'View 10 attendee profiles',
    icon: 'people',
    category: BadgeCategory.SOCIAL,
    requirement: {
      action: BadgeAction.PROFILE_VIEWED,
      targetValue: 10,
      description: 'Connect with 10 attendees',
    },
    rarity: 'common',
  },

  PIONEER: {
    id: 'pioneer',
    name: 'Pioneer',
    description: 'Be among the first 100 to complete the scavenger hunt',
    icon: 'flag',
    category: BadgeCategory.COMPETITIVE,
    requirement: {
      action: BadgeAction.SCAVENGER_HUNT_COMPLETED,
      targetValue: 1,
      description: 'Complete scavenger hunt (limited to first 100)',
    },
    rarity: 'epic',
  },

  CHAMPION: {
    id: 'champion',
    name: 'Champion',
    description: 'Earn 200 or more points',
    icon: 'trophy',
    category: BadgeCategory.ACHIEVEMENT,
    requirement: {
      action: BadgeAction.POINTS_EARNED,
      targetValue: 200,
      description: 'Earn 200+ points',
    },
    rarity: 'rare',
  },
};

/**
 * Get all badges as an array
 */
export function getAllBadges(): Badge[] {
  return Object.values(BADGES);
}

/**
 * Get a specific badge by ID
 */
export function getBadgeById(id: string): Badge | undefined {
  return BADGES[id.toUpperCase()];
}

/**
 * Get badges by category
 */
export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return getAllBadges().filter((badge) => badge.category === category);
}

/**
 * Get badges by rarity
 */
export function getBadgesByRarity(rarity: 'common' | 'rare' | 'epic' | 'legendary'): Badge[] {
  return getAllBadges().filter((badge) => badge.rarity === rarity);
}
