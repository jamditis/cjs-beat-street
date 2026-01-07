// React hook for achievement tracking and badge management

import { useState, useEffect, useCallback } from 'react';
import { eventBus } from '../lib/EventBus';
import { getBadgeProgress, getUserAchievements } from '../services/achievements';
import { Badge, BadgeProgress, BadgeUnlockEvent, UserAchievements } from '../types/achievements';
import { getAllBadges } from '../config/badges';

interface BadgeWithProgress extends BadgeProgress {
  badge: Badge;
  isUnlocked: boolean;
  progressPercentage: number;
}

interface UseAchievementsOptions {
  userId: string;
  enabled?: boolean;
}

export function useAchievements(options: UseAchievementsOptions | null) {
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [recentUnlock, setRecentUnlock] = useState<BadgeUnlockEvent | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievements | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = options?.userId;
  const enabled = options?.enabled ?? true;

  // Load badge progress
  const loadBadgeProgress = useCallback(async () => {
    if (!userId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [progress, achievements] = await Promise.all([
        getBadgeProgress(userId),
        getUserAchievements(userId),
      ]);

      const badgesWithProgress: BadgeWithProgress[] = progress.map((p) => ({
        ...p,
        isUnlocked: !!p.unlockedAt,
        progressPercentage: Math.min(100, (p.currentValue / p.targetValue) * 100),
      }));

      setBadges(badgesWithProgress);
      setUserAchievements(achievements);
    } catch (error) {
      console.error('[useAchievements] Failed to load badge progress:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  // Initial load
  useEffect(() => {
    loadBadgeProgress();
  }, [loadBadgeProgress]);

  // Listen for badge unlock events
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = eventBus.on('badge-unlocked', (data: unknown) => {
      const event = data as BadgeUnlockEvent;

      // Only handle unlocks for this user
      if (event.userId !== userId) {
        return;
      }

      setRecentUnlock(event);

      // Reload badge progress
      loadBadgeProgress();

      // Clear recent unlock after 5 seconds
      setTimeout(() => {
        setRecentUnlock(null);
      }, 5000);
    });

    return unsubscribe;
  }, [userId, enabled, loadBadgeProgress]);

  // Get unlocked badges
  const unlockedBadges = badges.filter((b) => b.isUnlocked);

  // Get in-progress badges (not unlocked, has some progress)
  const inProgressBadges = badges.filter((b) => !b.isUnlocked && b.currentValue > 0);

  // Get locked badges (not started)
  const lockedBadges = badges.filter((b) => !b.isUnlocked && b.currentValue === 0);

  // Get all badge definitions
  const allBadgeDefinitions = getAllBadges();

  return {
    badges,
    unlockedBadges,
    inProgressBadges,
    lockedBadges,
    allBadgeDefinitions,
    recentUnlock,
    userAchievements,
    loading,
    refresh: loadBadgeProgress,
  };
}
