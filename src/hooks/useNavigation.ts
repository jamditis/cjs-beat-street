import { useState, useEffect, useCallback } from 'react';
import { eventBus } from '../lib/EventBus';

export interface NavigationDestination {
  poiId: string;
  name?: string;
  position: { x: number; y: number };
}

interface NavigationState {
  isNavigating: boolean;
  destination: NavigationDestination | null;
  distance: number | null;
  compass: string | null;
  hasArrived: boolean;
}

export function useNavigation() {
  const [state, setState] = useState<NavigationState>({
    isNavigating: false,
    destination: null,
    distance: null,
    compass: null,
    hasArrived: false,
  });

  // Listen for navigation events
  useEffect(() => {
    // Navigation started
    const unsubStart = eventBus.on('navigation-started', (data: unknown) => {
      const navData = data as {
        target: { poiId: string; name?: string; position: { x: number; y: number } };
        distance: number | null;
      };

      setState({
        isNavigating: true,
        destination: {
          poiId: navData.target.poiId,
          name: navData.target.name,
          position: navData.target.position,
        },
        distance: navData.distance,
        compass: null,
        hasArrived: false,
      });
    });

    // Navigation update
    const unsubUpdate = eventBus.on('navigation-update', (data: unknown) => {
      const navData = data as { distance: number; compass: string };

      setState((prev) => ({
        ...prev,
        distance: navData.distance,
        compass: navData.compass,
      }));
    });

    // Navigation arrived
    const unsubArrived = eventBus.on('navigation-arrived', () => {
      setState((prev) => ({
        ...prev,
        hasArrived: true,
      }));
    });

    // Navigation cancelled
    const unsubCancel = eventBus.on('navigation-cancelled', () => {
      setState({
        isNavigating: false,
        destination: null,
        distance: null,
        compass: null,
        hasArrived: false,
      });
    });

    return () => {
      unsubStart();
      unsubUpdate();
      unsubArrived();
      unsubCancel();
    };
  }, []);

  /**
   * Start navigation to a POI
   */
  const startNavigation = useCallback((poiId: string, position: { x: number; y: number }, name?: string) => {
    eventBus.emit('navigate-to-poi', {
      poiId,
      position,
      name,
    });
  }, []);

  /**
   * Stop/cancel current navigation
   */
  const stopNavigation = useCallback(() => {
    eventBus.emit('cancel-navigation');
  }, []);

  /**
   * Format distance for display
   */
  const getFormattedDistance = useCallback((): string => {
    if (state.distance === null) return '...';
    return state.distance < 1000
      ? `${Math.round(state.distance)}m`
      : `${(state.distance / 1000).toFixed(1)}km`;
  }, [state.distance]);

  /**
   * Calculate estimated time of arrival
   */
  const getETA = useCallback((): string => {
    if (state.distance === null) return '...';
    // Assume walking speed of ~5 km/h = 83 m/min
    const minutes = Math.ceil(state.distance / 83);
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, [state.distance]);

  /**
   * Get compass arrow rotation in degrees
   */
  const getCompassRotation = useCallback((): number => {
    if (!state.compass) return 0;
    const rotations: Record<string, number> = {
      N: 0,
      NE: 45,
      E: 90,
      SE: 135,
      S: 180,
      SW: 225,
      W: 270,
      NW: 315,
    };
    return rotations[state.compass] || 0;
  }, [state.compass]);

  return {
    // State
    isNavigating: state.isNavigating,
    destination: state.destination,
    distance: state.distance,
    compass: state.compass,
    hasArrived: state.hasArrived,

    // Actions
    startNavigation,
    stopNavigation,

    // Computed values
    formattedDistance: getFormattedDistance(),
    eta: getETA(),
    compassRotation: getCompassRotation(),
  };
}

/**
 * Hook for listening to specific navigation events
 */
export function useNavigationEvent(
  eventName: 'navigation-started' | 'navigation-update' | 'navigation-arrived' | 'navigation-cancelled',
  callback: (data: unknown) => void
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(eventName, callback);
    return unsubscribe;
  }, [eventName, callback]);
}
