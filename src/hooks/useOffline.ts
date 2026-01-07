import { useState, useEffect, useCallback } from 'react';
import { cacheData, getCachedData } from '../services/offline';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cache = useCallback(async (key: string, data: unknown) => {
    await cacheData(key, data);
  }, []);

  const getCached = useCallback(async <T>(key: string): Promise<T | undefined> => {
    return getCachedData<T>(key);
  }, []);

  return {
    isOnline,
    cache,
    getCached,
  };
}
