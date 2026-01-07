/**
 * React hook for scavenger hunt functionality
 * Manages hunt items, progress, check-ins, and leaderboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { eventBus } from '../lib/EventBus';
import { VenueId } from '../types/venue';
import {
  HuntItem,
  HuntProgress,
  CheckInMethod,
  LeaderboardEntry,
  HuntStats,
  PROXIMITY_THRESHOLD,
  HuntItemType,
} from '../types/gamification';
import {
  getHuntItems,
  getProgress,
  checkIn as checkInService,
  getLeaderboard as getLeaderboardService,
  getHuntStats,
  getNearbyHuntItems,
  updateProgressDisplayName,
} from '../services/scavenger';

interface UseScavengerHuntOptions {
  userId: string;
  venueId: VenueId;
  displayName?: string;
  playerPosition?: { x: number; y: number };
  autoCheckInEnabled?: boolean;
}

interface UseScavengerHuntReturn {
  // State
  huntItems: HuntItem[];
  progress: HuntProgress | null;
  leaderboard: LeaderboardEntry[];
  nearbyItems: HuntItem[];
  stats: HuntStats | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  checkIn: (itemId: string, method?: CheckInMethod) => Promise<void>;
  refreshProgress: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  refreshHuntItems: () => Promise<void>;

  // Helpers
  isItemCompleted: (itemId: string) => boolean;
  getItemById: (itemId: string) => HuntItem | undefined;
  filterItemsByType: (type: HuntItemType | HuntItemType[]) => HuntItem[];
}

export function useScavengerHunt(
  options: UseScavengerHuntOptions
): UseScavengerHuntReturn {
  const {
    userId,
    venueId,
    displayName,
    playerPosition,
    autoCheckInEnabled = false,
  } = options;

  const [huntItems, setHuntItems] = useState<HuntItem[]>([]);
  const [progress, setProgress] = useState<HuntProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<HuntStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch hunt items on mount
  const refreshHuntItems = useCallback(async () => {
    try {
      setError(null);
      const items = await getHuntItems(venueId);
      setHuntItems(items);
    } catch (err) {
      const error = err as Error;
      console.error('[useScavengerHunt] Failed to fetch hunt items:', error);
      setError(error);
    }
  }, [venueId]);

  // Fetch user progress
  const refreshProgress = useCallback(async () => {
    try {
      setError(null);
      const userProgress = await getProgress(userId, venueId);
      setProgress(userProgress);

      // Update stats when progress changes
      const huntStats = await getHuntStats(userId, venueId);
      setStats(huntStats);
    } catch (err) {
      const error = err as Error;
      console.error('[useScavengerHunt] Failed to fetch progress:', error);
      setError(error);
    }
  }, [userId, venueId]);

  // Fetch leaderboard
  const refreshLeaderboard = useCallback(async () => {
    try {
      setError(null);
      const leaders = await getLeaderboardService(venueId, 20);
      setLeaderboard(leaders);
    } catch (err) {
      const error = err as Error;
      console.error('[useScavengerHunt] Failed to fetch leaderboard:', error);
      setError(error);
    }
  }, [venueId]);

  // Initial load
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await Promise.all([
        refreshHuntItems(),
        refreshProgress(),
        refreshLeaderboard(),
      ]);
      setIsLoading(false);
    }

    loadData();
  }, [refreshHuntItems, refreshProgress, refreshLeaderboard]);

  // Update display name in progress if provided
  useEffect(() => {
    if (displayName && progress && progress.userId === userId) {
      updateProgressDisplayName(userId, venueId, displayName).catch((error) => {
        console.error(
          '[useScavengerHunt] Failed to update display name:',
          error
        );
      });
    }
  }, [displayName, userId, venueId, progress]);

  // Calculate nearby items based on player position
  const nearbyItems = useMemo(() => {
    if (!playerPosition || huntItems.length === 0) {
      return [];
    }

    const completedIds = new Set(
      progress?.completedItems.map((c) => c.itemId) || []
    );

    // Filter out completed items and get items within proximity threshold
    const uncollectedItems = huntItems.filter(
      (item) => !completedIds.has(item.id)
    );

    return getNearbyHuntItems(uncollectedItems, playerPosition, PROXIMITY_THRESHOLD);
  }, [playerPosition, huntItems, progress]);

  // Auto check-in for nearby items (if enabled)
  useEffect(() => {
    if (!autoCheckInEnabled || nearbyItems.length === 0) {
      return;
    }

    // Auto check-in the nearest item if within proximity
    const nearestItem = nearbyItems[0];
    if (nearestItem && playerPosition) {
      const dx = nearestItem.location.x - playerPosition.x;
      const dy = nearestItem.location.y - playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only auto check-in if very close (half of proximity threshold)
      if (distance <= PROXIMITY_THRESHOLD / 2) {
        checkInService(userId, nearestItem.id, venueId, CheckInMethod.PROXIMITY)
          .then((updatedProgress) => {
            setProgress(updatedProgress);
            eventBus.emit('hunt-item-collected', {
              itemId: nearestItem.id,
              item: nearestItem,
              method: CheckInMethod.PROXIMITY,
              progress: updatedProgress,
            });
            refreshProgress();
          })
          .catch((err) => {
            // Silently fail for auto check-ins (might be already collected)
            console.debug('[useScavengerHunt] Auto check-in failed:', err);
          });
      }
    }
  }, [autoCheckInEnabled, nearbyItems, playerPosition, userId, venueId, refreshProgress]);

  // Manual check-in
  const checkIn = useCallback(
    async (itemId: string, method: CheckInMethod = CheckInMethod.TAP) => {
      try {
        setError(null);

        // Find the item
        const item = huntItems.find((i) => i.id === itemId);
        if (!item) {
          throw new Error('Hunt item not found');
        }

        // Perform check-in
        const updatedProgress = await checkInService(
          userId,
          itemId,
          venueId,
          method,
          playerPosition
            ? { ...playerPosition, zone: 'current' }
            : undefined
        );

        setProgress(updatedProgress);

        // Emit event for UI feedback
        eventBus.emit('hunt-item-collected', {
          itemId,
          item,
          method,
          progress: updatedProgress,
        });

        // Refresh data
        await Promise.all([refreshProgress(), refreshLeaderboard()]);
      } catch (err) {
        const error = err as Error;
        console.error('[useScavengerHunt] Check-in failed:', error);
        setError(error);
        throw error;
      }
    },
    [userId, venueId, huntItems, playerPosition, refreshProgress, refreshLeaderboard]
  );

  // Check if item is completed
  const isItemCompleted = useCallback(
    (itemId: string): boolean => {
      if (!progress) return false;
      return progress.completedItems.some((c) => c.itemId === itemId);
    },
    [progress]
  );

  // Get item by ID
  const getItemById = useCallback(
    (itemId: string): HuntItem | undefined => {
      return huntItems.find((item) => item.id === itemId);
    },
    [huntItems]
  );

  // Filter items by type
  const filterItemsByType = useCallback(
    (type: HuntItemType | HuntItemType[]): HuntItem[] => {
      const types = Array.isArray(type) ? type : [type];
      return huntItems.filter((item) => types.includes(item.type));
    },
    [huntItems]
  );

  // Listen for player movement events to update nearby items
  useEffect(() => {
    const unsubscribe = eventBus.on('player-moved', () => {
      // Player position is updated via props, so we don't need to do anything here
      // This is just for potential future enhancements
    });

    return unsubscribe;
  }, []);

  return {
    // State
    huntItems,
    progress,
    leaderboard,
    nearbyItems,
    stats,
    isLoading,
    error,

    // Actions
    checkIn,
    refreshProgress,
    refreshLeaderboard,
    refreshHuntItems,

    // Helpers
    isItemCompleted,
    getItemById,
    filterItemsByType,
  };
}

/**
 * Hook for listening to hunt events
 */
export function useHuntEvent(
  eventName: 'hunt-item-collected',
  callback: (data: unknown) => void
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(eventName, callback);
    return unsubscribe;
  }, [eventName, callback]);
}
