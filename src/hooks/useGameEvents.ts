import { useEffect, useCallback } from 'react';
import { eventBus } from '../lib/EventBus';

export function useGameEvents<T>(
  eventName: string,
  callback: (data: T) => void
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(eventName, callback as (...args: unknown[]) => void);
    return unsubscribe;
  }, [eventName, callback]);
}

export function useEmitGameEvent() {
  return useCallback((eventName: string, data?: unknown) => {
    eventBus.emit(eventName, data);
  }, []);
}
