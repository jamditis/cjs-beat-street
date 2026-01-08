/**
 * Achievement tracking hook for Beat Street CJS2026
 *
 * Manages user progress, checks for achievement unlocks,
 * and persists data to Firestore.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { eventBus } from '../lib/EventBus';
import {
  Achievement,
  UserProgress,
  AchievementUnlockEvent,
  LeaderboardEntry,
  AchievementProgress,
  UnlockedAchievement,
} from '../types/achievement';
import {
  achievements,
  getAchievementById,
  COFFEE_SHOP_IDS,
} from '../data/achievements';
import { POIType } from '../types/poi';
import { pittsburghPOIs } from '../data/pittsburgh-pois';

/**
 * Default empty progress object
 */
function createEmptyProgress(uid: string): UserProgress {
  return {
    uid,
    unlockedAchievements: [],
    achievementRecords: [],
    totalPoints: 0,
    visitedPOIs: [],
    attendedSessions: [],
    connections: [],
    visitedZones: [],
    updatedAt: new Date(),
  };
}

/**
 * Get all sponsor POI IDs from the Pittsburgh POIs data
 */
function getSponsorPOIIds(): string[] {
  return pittsburghPOIs
    .filter((poi) => poi.type === POIType.SPONSOR)
    .map((poi) => poi.id);
}

interface UseAchievementsOptions {
  uid: string | null;
  displayName?: string;
  enabled?: boolean;
}

interface UseAchievementsReturn {
  /** User's current progress */
  progress: UserProgress | null;
  /** All achievements with unlock status */
  allAchievements: (Achievement & { unlocked: boolean; unlockedAt?: Date })[];
  /** Recently unlocked achievements (for notifications) */
  recentUnlocks: AchievementUnlockEvent[];
  /** Clear recent unlocks after showing notifications */
  clearRecentUnlocks: () => void;
  /** Total points earned */
  totalPoints: number;
  /** Number of achievements unlocked */
  unlockedCount: number;
  /** Total number of achievements */
  totalCount: number;
  /** Leaderboard entries */
  leaderboard: LeaderboardEntry[];
  /** User's rank on leaderboard */
  userRank: number | null;
  /** Track a POI visit */
  trackPOIVisit: (poiId: string, zone?: string) => Promise<void>;
  /** Track session attendance */
  trackSessionAttendance: (sessionId: string) => Promise<void>;
  /** Track a new connection */
  trackConnection: (targetUid: string) => Promise<void>;
  /** Get progress toward a specific achievement */
  getAchievementProgress: (achievementId: string) => AchievementProgress | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh leaderboard */
  refreshLeaderboard: () => Promise<void>;
}

/**
 * React hook for managing achievements and gamification
 */
export function useAchievements(
  options: UseAchievementsOptions
): UseAchievementsReturn {
  const { uid, displayName, enabled = true } = options;

  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [recentUnlocks, setRecentUnlocks] = useState<AchievementUnlockEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if we've initialized to avoid duplicate setup
  const initializedRef = useRef(false);

  // Firestore document reference
  const progressDocRef = useMemo(
    () => (uid ? doc(db, 'achievements', uid) : null),
    [uid]
  );

  /**
   * Load or initialize user progress from Firestore
   */
  useEffect(() => {
    if (!uid || !enabled || !progressDocRef) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Subscribe to progress updates
    const unsubscribe = onSnapshot(
      progressDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Convert Firestore timestamps to Date objects
          const progressData: UserProgress = {
            uid: data.uid || uid,
            unlockedAchievements: data.unlockedAchievements || [],
            achievementRecords: (data.achievementRecords || []).map(
              (record: { achievementId: string; unlockedAt: Timestamp }) => ({
                achievementId: record.achievementId,
                unlockedAt: record.unlockedAt?.toDate?.() || new Date(),
              })
            ),
            totalPoints: data.totalPoints || 0,
            visitedPOIs: data.visitedPOIs || [],
            attendedSessions: data.attendedSessions || [],
            connections: data.connections || [],
            visitedZones: data.visitedZones || [],
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          };
          setProgress(progressData);
        } else if (!initializedRef.current) {
          // Initialize new user progress
          const newProgress = createEmptyProgress(uid);
          setDoc(progressDocRef, {
            ...newProgress,
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            console.error('[useAchievements] Failed to initialize progress:', err);
            setError(err);
          });
          initializedRef.current = true;
          setProgress(newProgress);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('[useAchievements] Snapshot error:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid, enabled, progressDocRef]);

  /**
   * Check if an achievement should be unlocked based on current progress
   */
  const checkAchievementUnlock = useCallback(
    (achievement: Achievement, currentProgress: UserProgress): boolean => {
      const { requirement } = achievement;

      switch (requirement.type) {
        case 'visit_count':
          return currentProgress.visitedPOIs.length >= (requirement.count || 1);

        case 'visit_poi':
          return currentProgress.visitedPOIs.includes(requirement.target as string);

        case 'visit_pois':
          if (requirement.targets && requirement.count) {
            const visitedTargets = requirement.targets.filter((t) =>
              currentProgress.visitedPOIs.includes(t)
            );
            return visitedTargets.length >= requirement.count;
          }
          return false;

        case 'visit_all_sponsors': {
          const sponsorIds = getSponsorPOIIds();
          // If no sponsors defined yet, don't unlock
          if (sponsorIds.length === 0) return false;
          return sponsorIds.every((id) => currentProgress.visitedPOIs.includes(id));
        }

        case 'visit_all_coffee_shops':
          return COFFEE_SHOP_IDS.every((id) =>
            currentProgress.visitedPOIs.includes(id)
          );

        case 'attend_session':
          return currentProgress.attendedSessions.includes(
            requirement.target as string
          );

        case 'attend_sessions':
          if (requirement.targets) {
            // Must attend all specific sessions
            return requirement.targets.every((id) =>
              currentProgress.attendedSessions.includes(id)
            );
          }
          return (
            currentProgress.attendedSessions.length >= (requirement.count || 1)
          );

        case 'meet_attendees':
          return currentProgress.connections.length >= (requirement.count || 1);

        case 'visit_zone':
          return currentProgress.visitedZones.includes(
            requirement.target as string
          );

        default:
          return false;
      }
    },
    []
  );

  /**
   * Check for newly unlocked achievements and update Firestore
   */
  const checkAndUnlockAchievements = useCallback(
    async (updatedProgress: UserProgress): Promise<AchievementUnlockEvent[]> => {
      if (!progressDocRef) return [];

      const newUnlocks: AchievementUnlockEvent[] = [];
      const newUnlockedIds: string[] = [];
      let pointsEarned = 0;

      for (const achievement of achievements) {
        // Skip already unlocked achievements
        if (updatedProgress.unlockedAchievements.includes(achievement.id)) {
          continue;
        }

        // Check if achievement should be unlocked
        if (checkAchievementUnlock(achievement, updatedProgress)) {
          newUnlockedIds.push(achievement.id);
          pointsEarned += achievement.points;

          const unlockEvent: AchievementUnlockEvent = {
            achievement,
            totalPoints: updatedProgress.totalPoints + pointsEarned,
            unlockedAt: new Date(),
          };
          newUnlocks.push(unlockEvent);
        }
      }

      // Update Firestore if there are new unlocks
      if (newUnlocks.length > 0) {
        const newRecords: UnlockedAchievement[] = newUnlocks.map((unlock) => ({
          achievementId: unlock.achievement.id,
          unlockedAt: unlock.unlockedAt,
        }));

        try {
          await setDoc(
            progressDocRef,
            {
              unlockedAchievements: [
                ...updatedProgress.unlockedAchievements,
                ...newUnlockedIds,
              ],
              achievementRecords: [
                ...updatedProgress.achievementRecords,
                ...newRecords,
              ],
              totalPoints: updatedProgress.totalPoints + pointsEarned,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // Emit events for each unlock
          newUnlocks.forEach((unlock) => {
            eventBus.emit('achievement-unlocked', unlock);
          });

          // Add to recent unlocks for UI notifications
          setRecentUnlocks((prev) => [...prev, ...newUnlocks]);
        } catch (err) {
          console.error('[useAchievements] Failed to save unlocks:', err);
          throw err;
        }
      }

      return newUnlocks;
    },
    [progressDocRef, checkAchievementUnlock]
  );

  /**
   * Track a POI visit
   */
  const trackPOIVisit = useCallback(
    async (poiId: string, zone?: string): Promise<void> => {
      if (!uid || !progress || !progressDocRef) return;

      // Check if already visited
      if (progress.visitedPOIs.includes(poiId)) return;

      const updatedPOIs = [...progress.visitedPOIs, poiId];
      const updatedZones = zone && !progress.visitedZones.includes(zone)
        ? [...progress.visitedZones, zone]
        : progress.visitedZones;

      try {
        // Update Firestore
        await setDoc(
          progressDocRef,
          {
            visitedPOIs: updatedPOIs,
            visitedZones: updatedZones,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Check for achievement unlocks
        const updatedProgress: UserProgress = {
          ...progress,
          visitedPOIs: updatedPOIs,
          visitedZones: updatedZones,
        };

        await checkAndUnlockAchievements(updatedProgress);
      } catch (err) {
        console.error('[useAchievements] Failed to track POI visit:', err);
        setError(err as Error);
      }
    },
    [uid, progress, progressDocRef, checkAndUnlockAchievements]
  );

  /**
   * Track session attendance
   */
  const trackSessionAttendance = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!uid || !progress || !progressDocRef) return;

      // Check if already attended
      if (progress.attendedSessions.includes(sessionId)) return;

      const updatedSessions = [...progress.attendedSessions, sessionId];

      try {
        await setDoc(
          progressDocRef,
          {
            attendedSessions: updatedSessions,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        const updatedProgress: UserProgress = {
          ...progress,
          attendedSessions: updatedSessions,
        };

        await checkAndUnlockAchievements(updatedProgress);
      } catch (err) {
        console.error('[useAchievements] Failed to track session:', err);
        setError(err as Error);
      }
    },
    [uid, progress, progressDocRef, checkAndUnlockAchievements]
  );

  /**
   * Track a new connection (networking)
   */
  const trackConnection = useCallback(
    async (targetUid: string): Promise<void> => {
      if (!uid || !progress || !progressDocRef) return;

      // Check if already connected
      if (progress.connections.includes(targetUid)) return;

      const updatedConnections = [...progress.connections, targetUid];

      try {
        await setDoc(
          progressDocRef,
          {
            connections: updatedConnections,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        const updatedProgress: UserProgress = {
          ...progress,
          connections: updatedConnections,
        };

        await checkAndUnlockAchievements(updatedProgress);
      } catch (err) {
        console.error('[useAchievements] Failed to track connection:', err);
        setError(err as Error);
      }
    },
    [uid, progress, progressDocRef, checkAndUnlockAchievements]
  );

  /**
   * Get progress toward a specific achievement
   */
  const getAchievementProgress = useCallback(
    (achievementId: string): AchievementProgress | null => {
      if (!progress) return null;

      const achievement = getAchievementById(achievementId);
      if (!achievement) return null;

      const { requirement } = achievement;
      let current = 0;
      let target = 1;

      switch (requirement.type) {
        case 'visit_count':
          current = progress.visitedPOIs.length;
          target = requirement.count || 1;
          break;

        case 'visit_pois':
          if (requirement.targets) {
            current = requirement.targets.filter((t) =>
              progress.visitedPOIs.includes(t)
            ).length;
            target = requirement.count || requirement.targets.length;
          }
          break;

        case 'visit_all_sponsors': {
          const sponsorIds = getSponsorPOIIds();
          current = sponsorIds.filter((id) =>
            progress.visitedPOIs.includes(id)
          ).length;
          target = sponsorIds.length || 1;
          break;
        }

        case 'visit_all_coffee_shops':
          current = COFFEE_SHOP_IDS.filter((id) =>
            progress.visitedPOIs.includes(id)
          ).length;
          target = COFFEE_SHOP_IDS.length;
          break;

        case 'attend_sessions':
          if (requirement.targets) {
            current = requirement.targets.filter((id) =>
              progress.attendedSessions.includes(id)
            ).length;
            target = requirement.targets.length;
          } else {
            current = progress.attendedSessions.length;
            target = requirement.count || 1;
          }
          break;

        case 'meet_attendees':
          current = progress.connections.length;
          target = requirement.count || 1;
          break;

        case 'visit_poi':
        case 'attend_session':
          // Binary achievements - either done or not
          current = requirement.target &&
            (requirement.type === 'visit_poi'
              ? progress.visitedPOIs.includes(requirement.target as string)
              : progress.attendedSessions.includes(requirement.target as string))
            ? 1
            : 0;
          target = 1;
          break;

        default:
          return null;
      }

      return {
        achievementId,
        current: Math.min(current, target),
        target,
        percentage: Math.min(Math.round((current / target) * 100), 100),
      };
    },
    [progress]
  );

  /**
   * Fetch leaderboard from Firestore
   */
  const refreshLeaderboard = useCallback(async (): Promise<void> => {
    try {
      const leaderboardQuery = query(
        collection(db, 'achievements'),
        orderBy('totalPoints', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(leaderboardQuery);
      const entries: LeaderboardEntry[] = [];
      let rank = 1;

      snapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          uid: doc.id,
          displayName: data.displayName || 'Anonymous',
          totalPoints: data.totalPoints || 0,
          achievementCount: (data.unlockedAchievements || []).length,
          rank: rank++,
        });
      });

      setLeaderboard(entries);
    } catch (err) {
      console.error('[useAchievements] Failed to fetch leaderboard:', err);
    }
  }, []);

  // Initial leaderboard fetch
  useEffect(() => {
    if (enabled) {
      refreshLeaderboard();
    }
  }, [enabled, refreshLeaderboard]);

  /**
   * Update displayName in Firestore when it changes
   */
  useEffect(() => {
    if (!uid || !displayName || !progressDocRef) return;

    setDoc(progressDocRef, { displayName }, { merge: true }).catch((err) => {
      console.error('[useAchievements] Failed to update displayName:', err);
    });
  }, [uid, displayName, progressDocRef]);

  /**
   * Listen for POI interactions from the game
   */
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = eventBus.on('poi-interaction', (data: unknown) => {
      const { poiId, poiData } = data as {
        poiId: string;
        poiData: { position?: { zone?: string } };
      };
      trackPOIVisit(poiId, poiData?.position?.zone);
    });

    return unsubscribe;
  }, [enabled, trackPOIVisit]);

  /**
   * Listen for session attendance events
   */
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = eventBus.on('schedule-event', (data: unknown) => {
      const { sessionId, action } = data as { sessionId: string; action: string };
      if (action === 'attend' || action === 'check-in') {
        trackSessionAttendance(sessionId);
      }
    });

    return unsubscribe;
  }, [enabled, trackSessionAttendance]);

  /**
   * Listen for connection/wave events
   */
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = eventBus.on('send-wave', (data: unknown) => {
      const { toUid } = data as { toUid: string };
      trackConnection(toUid);
    });

    return unsubscribe;
  }, [enabled, trackConnection]);

  // Clear recent unlocks (after showing notifications)
  const clearRecentUnlocks = useCallback(() => {
    setRecentUnlocks([]);
  }, []);

  // Computed values
  const allAchievements = useMemo(() => {
    return achievements.map((a) => {
      const record = progress?.achievementRecords.find(
        (r) => r.achievementId === a.id
      );
      return {
        ...a,
        unlocked: progress?.unlockedAchievements.includes(a.id) || false,
        unlockedAt: record?.unlockedAt,
      };
    });
  }, [progress]);

  const totalPoints = progress?.totalPoints || 0;
  const unlockedCount = progress?.unlockedAchievements.length || 0;
  const totalCount = achievements.length;

  const userRank = useMemo(() => {
    if (!uid) return null;
    const entry = leaderboard.find((e) => e.uid === uid);
    return entry?.rank || null;
  }, [uid, leaderboard]);

  return {
    progress,
    allAchievements,
    recentUnlocks,
    clearRecentUnlocks,
    totalPoints,
    unlockedCount,
    totalCount,
    leaderboard,
    userRank,
    trackPOIVisit,
    trackSessionAttendance,
    trackConnection,
    getAchievementProgress,
    isLoading,
    error,
    refreshLeaderboard,
  };
}

/**
 * Hook to listen for achievement unlock events
 */
export function useAchievementEvents(
  onUnlock?: (event: AchievementUnlockEvent) => void
) {
  useEffect(() => {
    if (!onUnlock) return;

    const unsubscribe = eventBus.on('achievement-unlocked', (data: unknown) => {
      onUnlock(data as AchievementUnlockEvent);
    });

    return unsubscribe;
  }, [onUnlock]);
}
