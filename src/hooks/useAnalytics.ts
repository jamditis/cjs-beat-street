/**
 * useAnalytics Hook
 *
 * Convenience hook for analytics tracking in React components.
 * Provides:
 * - Auto-tracking of panel/view lifecycle
 * - Time-in-zone tracking
 * - Easy access to tracking functions
 * - Analytics opt-in/out management
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  initAnalytics,
  isAnalyticsEnabled,
  setAnalyticsPreferences,
  getAnalyticsPreferences,
  trackEvent,
  trackPOIView,
  trackPOIClose,
  trackPOIClick,
  trackSessionView,
  trackSessionCalendarAdd,
  trackZoneEnter,
  trackZoneExit,
  trackSponsorBoothVisit,
  trackMapInteraction,
  trackAchievementUnlock,
  trackAttendeeView,
  trackNavigationRequest,
  trackPanelOpen,
  trackPanelClose,
  forceFlush,
} from '../services/analytics';
import {
  POIEventProperties,
  SessionEventProperties,
  SponsorEventProperties,
} from '../types/analytics';
import { eventBus } from '../lib/EventBus';
import { VenueId } from '../types/venue';

/**
 * Initialize analytics on app startup
 * Call this once in your app's root component
 */
export function useAnalyticsInit(): void {
  useEffect(() => {
    initAnalytics();
  }, []);
}

/**
 * Hook to manage analytics consent
 */
export function useAnalyticsConsent() {
  const [enabled, setEnabled] = useState(() => getAnalyticsPreferences().enabled);

  const updateConsent = useCallback((value: boolean) => {
    setAnalyticsPreferences(value);
    setEnabled(value);
  }, []);

  return {
    analyticsEnabled: enabled,
    setAnalyticsEnabled: updateConsent,
  };
}

/**
 * Hook for tracking panel lifecycle
 * Automatically tracks open/close and duration
 */
export function usePanelTracking(
  panelType: string,
  isOpen: boolean,
  properties: Record<string, unknown> = {}
) {
  const openTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
      trackPanelOpen(panelType, properties);
    } else if (openTimeRef.current !== null) {
      const duration = Date.now() - openTimeRef.current;
      trackPanelClose(panelType, duration, properties);
      openTimeRef.current = null;
    }
  }, [isOpen, panelType]);
}

/**
 * Hook for tracking POI interactions
 * Tracks view, click, and navigation events
 */
export function usePOITracking(venueId?: VenueId, zone?: string) {
  const viewStartTimeRef = useRef<Map<string, number>>(new Map());

  const trackView = useCallback(
    (properties: POIEventProperties) => {
      viewStartTimeRef.current.set(properties.poiId, Date.now());
      trackPOIView({
        ...properties,
        venueId: venueId || properties.venueId,
        zone: zone || properties.zone,
      });
    },
    [venueId, zone]
  );

  const trackClose = useCallback((poiId: string, poiType: string, poiName: string) => {
    const startTime = viewStartTimeRef.current.get(poiId);
    const duration = startTime ? Date.now() - startTime : undefined;
    viewStartTimeRef.current.delete(poiId);

    trackPOIClose(poiId, {
      poiType,
      poiName,
      duration,
      venueId,
      zone,
    });
  }, [venueId, zone]);

  const trackClick = useCallback(
    (properties: POIEventProperties) => {
      trackPOIClick({
        ...properties,
        venueId: venueId || properties.venueId,
        zone: zone || properties.zone,
      });
    },
    [venueId, zone]
  );

  const trackNavigation = useCallback(
    (poiId: string, poiName: string) => {
      trackNavigationRequest(poiId, poiName, { venueId, zone });
    },
    [venueId, zone]
  );

  return {
    trackView,
    trackClose,
    trackClick,
    trackNavigation,
  };
}

/**
 * Hook for tracking zone/area movements
 * Listens to EventBus for player-moved events
 */
export function useZoneTracking(venueId: VenueId) {
  const currentZoneRef = useRef<string | null>(null);
  const zoneEntryTimeRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const unsubscribe = eventBus.on('player-moved', (data: unknown) => {
      const moveData = data as { zone: string; x: number; y: number };
      const newZone = moveData.zone;

      if (newZone !== currentZoneRef.current) {
        // Track exit from previous zone
        if (currentZoneRef.current) {
          const entryTime = zoneEntryTimeRef.current.get(currentZoneRef.current);
          const duration = entryTime ? Date.now() - entryTime : undefined;

          trackZoneExit(currentZoneRef.current, {
            previousZone: currentZoneRef.current,
            venueId,
            duration,
          });

          zoneEntryTimeRef.current.delete(currentZoneRef.current);
        }

        // Track entry to new zone
        zoneEntryTimeRef.current.set(newZone, Date.now());
        trackZoneEnter({
          zone: newZone,
          previousZone: currentZoneRef.current || undefined,
          venueId,
        });

        currentZoneRef.current = newZone;
      }
    });

    return () => {
      unsubscribe();
      // Track exit from final zone on cleanup
      if (currentZoneRef.current) {
        const entryTime = zoneEntryTimeRef.current.get(currentZoneRef.current);
        const duration = entryTime ? Date.now() - entryTime : undefined;
        trackZoneExit(currentZoneRef.current, { venueId, duration });
      }
    };
  }, [venueId]);
}

/**
 * Hook for tracking session interactions
 */
export function useSessionTracking() {
  const viewedSessionsRef = useRef<Set<string>>(new Set());

  const trackSessionInteraction = useCallback(
    (properties: SessionEventProperties) => {
      switch (properties.action) {
        case 'view':
          // Only track first view per session
          if (!viewedSessionsRef.current.has(properties.sessionId)) {
            viewedSessionsRef.current.add(properties.sessionId);
            trackSessionView(properties);
          }
          break;
        case 'calendar_add':
          trackSessionCalendarAdd(properties);
          break;
        case 'navigate':
          trackNavigationRequest(properties.sessionId, properties.sessionTitle, {
            room: properties.room,
          });
          break;
      }
    },
    []
  );

  return { trackSessionInteraction };
}

/**
 * Hook for tracking sponsor booth visits
 * Tracks time spent at sponsor booths
 */
export function useSponsorTracking() {
  const visitStartTimeRef = useRef<Map<string, number>>(new Map());

  const trackBoothEnter = useCallback((properties: SponsorEventProperties) => {
    visitStartTimeRef.current.set(properties.sponsorId, Date.now());
    trackSponsorBoothVisit({
      ...properties,
      actions: ['enter'],
    });
  }, []);

  const trackBoothExit = useCallback((sponsorId: string, sponsorName: string) => {
    const startTime = visitStartTimeRef.current.get(sponsorId);
    const duration = startTime ? Date.now() - startTime : undefined;
    visitStartTimeRef.current.delete(sponsorId);

    trackSponsorBoothVisit({
      sponsorId,
      sponsorName,
      duration,
      actions: ['exit'],
    });
  }, []);

  const trackBoothAction = useCallback(
    (properties: SponsorEventProperties, action: string) => {
      trackSponsorBoothVisit({
        ...properties,
        actions: [action],
      });
    },
    []
  );

  return {
    trackBoothEnter,
    trackBoothExit,
    trackBoothAction,
  };
}

/**
 * Main analytics hook providing all tracking functions
 */
export function useAnalytics() {
  return {
    // Core tracking
    trackEvent,
    forceFlush,

    // POI tracking
    trackPOIView,
    trackPOIClose,
    trackPOIClick,

    // Session tracking
    trackSessionView,
    trackSessionCalendarAdd,

    // Zone tracking
    trackZoneEnter,
    trackZoneExit,

    // Sponsor tracking
    trackSponsorBoothVisit,

    // Map tracking
    trackMapInteraction,

    // Achievement tracking
    trackAchievementUnlock,

    // Attendee tracking
    trackAttendeeView,

    // Navigation tracking
    trackNavigationRequest,

    // Panel tracking
    trackPanelOpen,
    trackPanelClose,

    // State
    isEnabled: isAnalyticsEnabled,
  };
}
