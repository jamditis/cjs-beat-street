import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToLeaderboard,
  getUserRank,
  optIn as serviceOptIn,
  optOut as serviceOptOut,
  isOptedIn as serviceIsOptedIn,
} from '../services/leaderboard';
import {
  LeaderboardEntry,
  LeaderboardQueryOptions,
  UserRankInfo,
} from '../types/leaderboard';

interface UseLeaderboardOptions {
  /** Current user's ID */
  userId?: string;

  /** User's display name (for opt-in) */
  displayName?: string;

  /** User's photo URL (for opt-in) */
  photoURL?: string;

  /** Query options for leaderboard */
  queryOptions?: LeaderboardQueryOptions;

  /** Whether to automatically fetch user's rank */
  fetchUserRank?: boolean;

  /** Whether to enable real-time updates */
  realtime?: boolean;
}

interface UseLeaderboardReturn {
  /** Top leaderboard entries */
  leaderboard: LeaderboardEntry[];

  /** Current user's rank info (null if not opted in) */
  userRank: UserRankInfo | null;

  /** Whether user has opted into leaderboard */
  isOptedIn: boolean;

  /** Toggle user's opt-in status */
  toggleOptIn: () => Promise<void>;

  /** Manually refresh leaderboard and user rank */
  refresh: () => Promise<void>;

  /** Loading states */
  loading: boolean;
  userRankLoading: boolean;
  optInLoading: boolean;

  /** Error states */
  error: Error | null;
  userRankError: Error | null;
  optInError: Error | null;
}

/**
 * React hook for leaderboard functionality
 * @param options Hook configuration options
 * @returns Leaderboard state and actions
 */
export function useLeaderboard(
  options: UseLeaderboardOptions = {}
): UseLeaderboardReturn {
  const {
    userId,
    displayName = '',
    photoURL,
    queryOptions = {},
    fetchUserRank: shouldFetchUserRank = true,
    realtime = true,
  } = options;

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // User rank state
  const [userRank, setUserRank] = useState<UserRankInfo | null>(null);
  const [userRankLoading, setUserRankLoading] = useState(false);
  const [userRankError, setUserRankError] = useState<Error | null>(null);

  // Opt-in state
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);
  const [optInError, setOptInError] = useState<Error | null>(null);

  // Fetch user's opt-in status
  useEffect(() => {
    if (!userId) {
      setIsOptedIn(false);
      return;
    }

    let mounted = true;

    const checkOptIn = async () => {
      try {
        const optedIn = await serviceIsOptedIn(userId);
        if (mounted) {
          setIsOptedIn(optedIn);
        }
      } catch (err) {
        console.error('[useLeaderboard] Failed to check opt-in status:', err);
      }
    };

    checkOptIn();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // Subscribe to leaderboard updates
  useEffect(() => {
    if (!realtime) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToLeaderboard(
      queryOptions,
      (entries) => {
        setLeaderboard(entries);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [realtime, queryOptions]);

  // Fetch user rank if opted in
  useEffect(() => {
    if (!userId || !isOptedIn || !shouldFetchUserRank) {
      setUserRank(null);
      return;
    }

    let mounted = true;

    const fetchRank = async () => {
      setUserRankLoading(true);
      setUserRankError(null);

      try {
        const rank = await getUserRank(userId);
        if (mounted) {
          setUserRank(rank);
          setUserRankLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setUserRankError(err as Error);
          setUserRankLoading(false);
        }
      }
    };

    fetchRank();

    // Refresh rank periodically
    const interval = setInterval(fetchRank, 30000); // Every 30 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userId, isOptedIn, shouldFetchUserRank]);

  // Toggle opt-in status
  const toggleOptIn = useCallback(async () => {
    if (!userId || !displayName) {
      console.error('[useLeaderboard] Cannot toggle opt-in: missing userId or displayName');
      return;
    }

    setOptInLoading(true);
    setOptInError(null);

    try {
      if (isOptedIn) {
        await serviceOptOut(userId);
        setIsOptedIn(false);
        setUserRank(null);
      } else {
        await serviceOptIn(userId, displayName, photoURL);
        setIsOptedIn(true);
      }
      setOptInLoading(false);
    } catch (err) {
      setOptInError(err as Error);
      setOptInLoading(false);
      console.error('[useLeaderboard] Failed to toggle opt-in:', err);
    }
  }, [userId, displayName, photoURL, isOptedIn]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (userId && isOptedIn && shouldFetchUserRank) {
      setUserRankLoading(true);
      setUserRankError(null);

      try {
        const rank = await getUserRank(userId);
        setUserRank(rank);
        setUserRankLoading(false);
      } catch (err) {
        setUserRankError(err as Error);
        setUserRankLoading(false);
      }
    }
  }, [userId, isOptedIn, shouldFetchUserRank]);

  return {
    leaderboard,
    userRank,
    isOptedIn,
    toggleOptIn,
    refresh,
    loading,
    userRankLoading,
    optInLoading,
    error,
    userRankError,
    optInError,
  };
}
