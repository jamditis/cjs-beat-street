import { useState, useEffect, useCallback, useRef } from 'react';
import {
  cacheData,
  getCachedData,
  clearStaleCache,
  isPOICacheStale,
  getPOICacheTimestamp,
} from '../services/offline';

export interface OfflineState {
  isOnline: boolean;
  isPOICacheStale: boolean;
  lastCacheUpdate: number | null;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isPOICacheStale: true,
    lastCacheUpdate: null,
  });

  const hasInitialized = useRef(false);

  // Initialize cache status on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initCache() {
      try {
        // Clear stale cache entries on app start
        await clearStaleCache();

        // Check POI cache status
        const [isStale, timestamp] = await Promise.all([
          isPOICacheStale(),
          getPOICacheTimestamp(),
        ]);

        setState((prev) => ({
          ...prev,
          isPOICacheStale: isStale,
          lastCacheUpdate: timestamp,
        }));
      } catch (error) {
        console.error('[useOffline] Failed to initialize cache:', error);
      }
    }

    initCache();
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generic data caching
  const cache = useCallback(async (key: string, data: unknown): Promise<boolean> => {
    return cacheData(key, data);
  }, []);

  // Generic data retrieval
  const getCached = useCallback(async <T>(key: string): Promise<T | undefined> => {
    const data = await getCachedData<T>(key);
    return data ?? undefined;
  }, []);

  // Refresh cache status (call after network refresh)
  const refreshCacheStatus = useCallback(async () => {
    try {
      const [isStale, timestamp] = await Promise.all([
        isPOICacheStale(),
        getPOICacheTimestamp(),
      ]);

      setState((prev) => ({
        ...prev,
        isPOICacheStale: isStale,
        lastCacheUpdate: timestamp,
      }));
    } catch (error) {
      console.error('[useOffline] Failed to refresh cache status:', error);
    }
  }, []);

  // Check if we should refresh from network
  const shouldRefreshFromNetwork = useCallback((): boolean => {
    return state.isOnline && state.isPOICacheStale;
  }, [state.isOnline, state.isPOICacheStale]);

  return {
    // Status
    isOnline: state.isOnline,
    isPOICacheStale: state.isPOICacheStale,
    lastCacheUpdate: state.lastCacheUpdate,

    // Derived state
    shouldRefreshFromNetwork: shouldRefreshFromNetwork(),

    // Actions
    cache,
    getCached,
    refreshCacheStatus,
  };
}
