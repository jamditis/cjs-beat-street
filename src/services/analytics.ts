/**
 * Analytics Service for Beat Street
 *
 * Provides engagement analytics tracking for sponsor reporting.
 * Features:
 * - Event batching to reduce Firestore writes
 * - Session-based tracking (no PII)
 * - Privacy-respecting design (opt-in only)
 * - Automatic flush on page unload
 */

import {
  collection,
  writeBatch,
  serverTimestamp,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  EventType,
  AnalyticsEvent,
  AnalyticsDocument,
  AnalyticsPreferences,
  POIEventProperties,
  SessionEventProperties,
  ZoneEventProperties,
  SponsorEventProperties,
  MapInteractionProperties,
} from '../types/analytics';

// Constants for batching
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30000; // 30 seconds
const ANALYTICS_COLLECTION = 'analytics_events';
const ANALYTICS_PREFERENCES_KEY = 'beat-street-analytics-consent';
const SESSION_ID_KEY = 'beat-street-session-id';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create session ID from session storage
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Analytics state management
 */
interface AnalyticsState {
  enabled: boolean;
  sessionId: string;
  eventQueue: AnalyticsEvent[];
  flushTimer: ReturnType<typeof setTimeout> | null;
  zoneEntryTime: Map<string, number>;
  poiViewStartTime: Map<string, number>;
}

const state: AnalyticsState = {
  enabled: false,
  sessionId: '',
  eventQueue: [],
  flushTimer: null,
  zoneEntryTime: new Map(),
  poiViewStartTime: new Map(),
};

/**
 * Initialize analytics service
 * Call this on app startup to restore preferences and set up session
 */
export function initAnalytics(): void {
  // Restore preferences from localStorage
  const prefs = getAnalyticsPreferences();
  state.enabled = prefs.enabled;
  state.sessionId = getSessionId();

  // Set up flush interval
  if (state.enabled) {
    startFlushInterval();
  }

  // Set up page unload handler to flush remaining events
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);
  }

  console.log('[analytics] Initialized', {
    enabled: state.enabled,
    sessionId: state.sessionId.substring(0, 8) + '...',
  });
}

/**
 * Clean up analytics service
 */
export function destroyAnalytics(): void {
  stopFlushInterval();

  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  // Flush any remaining events
  flushEvents();
}

/**
 * Handle page unload - flush events synchronously
 */
function handleBeforeUnload(): void {
  // Use sendBeacon for reliable delivery on page unload
  if (state.eventQueue.length > 0 && state.enabled) {
    // For now, just try to flush - sendBeacon would require a separate endpoint
    flushEvents();
  }
}

/**
 * Handle visibility change - flush when page becomes hidden
 */
function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden' && state.eventQueue.length > 0) {
    flushEvents();
  }
}

/**
 * Start the periodic flush interval
 */
function startFlushInterval(): void {
  if (state.flushTimer) return;

  state.flushTimer = setInterval(() => {
    if (state.eventQueue.length > 0) {
      flushEvents();
    }
  }, FLUSH_INTERVAL_MS);
}

/**
 * Stop the flush interval
 */
function stopFlushInterval(): void {
  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }
}

/**
 * Get analytics preferences from localStorage
 */
export function getAnalyticsPreferences(): AnalyticsPreferences {
  try {
    const stored = localStorage.getItem(ANALYTICS_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        enabled: parsed.enabled ?? false,
        updatedAt: new Date(parsed.updatedAt || Date.now()),
      };
    }
  } catch (error) {
    console.warn('[analytics] Failed to read preferences:', error);
  }

  return {
    enabled: false,
    updatedAt: new Date(),
  };
}

/**
 * Set analytics preferences
 */
export function setAnalyticsPreferences(enabled: boolean): void {
  const prefs: AnalyticsPreferences = {
    enabled,
    updatedAt: new Date(),
  };

  try {
    localStorage.setItem(ANALYTICS_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn('[analytics] Failed to save preferences:', error);
  }

  state.enabled = enabled;

  if (enabled) {
    startFlushInterval();
  } else {
    stopFlushInterval();
    // Clear queue when disabled
    state.eventQueue = [];
  }

  console.log('[analytics] Preferences updated', { enabled });
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return state.enabled;
}

/**
 * Core event tracking function
 * All other tracking functions should use this
 */
export function trackEvent(
  eventType: EventType,
  properties: Record<string, unknown> = {}
): void {
  if (!state.enabled) {
    return;
  }

  const event: AnalyticsEvent = {
    eventType,
    sessionId: state.sessionId,
    timestamp: new Date(),
    properties,
  };

  state.eventQueue.push(event);

  // Flush if batch is full
  if (state.eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  }
}

/**
 * Flush events to Firestore
 */
async function flushEvents(): Promise<void> {
  if (state.eventQueue.length === 0 || !state.enabled) {
    return;
  }

  // Take events from queue
  const events = [...state.eventQueue];
  state.eventQueue = [];

  try {
    // Use batch write for efficiency
    const batch = writeBatch(db);

    events.forEach((event) => {
      const docRef = doc(collection(db, ANALYTICS_COLLECTION));
      const docData: AnalyticsDocument = {
        eventType: event.eventType,
        sessionId: event.sessionId,
        timestamp: serverTimestamp(),
        properties: event.properties,
        venueId: event.properties.venueId as string | undefined,
        poiId: event.properties.poiId as string | undefined,
        sponsorId: event.properties.sponsorId as string | undefined,
      };
      batch.set(docRef, docData);
    });

    await batch.commit();
    console.log(`[analytics] Flushed ${events.length} events`);
  } catch (error) {
    console.error('[analytics] Failed to flush events:', error);
    // Put events back in queue for retry
    state.eventQueue = [...events, ...state.eventQueue];
  }
}

// ============================================
// Convenience tracking functions
// ============================================

/**
 * Track POI view (when POI panel opens)
 */
export function trackPOIView(properties: POIEventProperties): void {
  state.poiViewStartTime.set(properties.poiId, Date.now());

  trackEvent('poi_view', {
    ...properties,
    startTime: Date.now(),
  });
}

/**
 * Track POI close (when POI panel closes) - calculates duration
 */
export function trackPOIClose(poiId: string, properties: Partial<POIEventProperties>): void {
  const startTime = state.poiViewStartTime.get(poiId);
  const duration = startTime ? Date.now() - startTime : undefined;

  state.poiViewStartTime.delete(poiId);

  trackEvent('panel_close', {
    poiId,
    ...properties,
    duration,
    panelType: 'poi',
  });
}

/**
 * Track POI click
 */
export function trackPOIClick(properties: POIEventProperties): void {
  trackEvent('poi_click', properties as unknown as Record<string, unknown>);
}

/**
 * Track session view
 */
export function trackSessionView(properties: SessionEventProperties): void {
  trackEvent('session_view', properties as unknown as Record<string, unknown>);
}

/**
 * Track adding session to calendar
 */
export function trackSessionCalendarAdd(properties: SessionEventProperties): void {
  trackEvent('session_calendar_add', {
    ...(properties as unknown as Record<string, unknown>),
    action: 'calendar_add',
  });
}

/**
 * Track zone entry
 */
export function trackZoneEnter(properties: ZoneEventProperties): void {
  state.zoneEntryTime.set(properties.zone, Date.now());

  trackEvent('zone_enter', {
    ...properties,
    entryTime: Date.now(),
  });
}

/**
 * Track zone exit - calculates duration
 */
export function trackZoneExit(zone: string, properties: Partial<ZoneEventProperties>): void {
  const entryTime = state.zoneEntryTime.get(zone);
  const duration = entryTime ? Date.now() - entryTime : undefined;

  state.zoneEntryTime.delete(zone);

  trackEvent('zone_exit', {
    zone,
    ...properties,
    duration,
  });
}

/**
 * Track sponsor booth visit
 */
export function trackSponsorBoothVisit(properties: SponsorEventProperties): void {
  trackEvent('sponsor_booth_visit', properties as unknown as Record<string, unknown>);
}

/**
 * Track map interaction
 */
export function trackMapInteraction(properties: MapInteractionProperties): void {
  trackEvent('map_interaction', properties as unknown as Record<string, unknown>);
}

/**
 * Track achievement unlock
 */
export function trackAchievementUnlock(
  achievementId: string,
  achievementName: string,
  properties: Record<string, unknown> = {}
): void {
  trackEvent('achievement_unlock', {
    achievementId,
    achievementName,
    ...properties,
  });
}

/**
 * Track attendee profile view
 */
export function trackAttendeeView(attendeeUid: string, context?: string): void {
  trackEvent('attendee_view', {
    targetUid: attendeeUid,
    context,
  });
}

/**
 * Track navigation request
 */
export function trackNavigationRequest(
  poiId: string,
  poiName: string,
  properties: Record<string, unknown> = {}
): void {
  trackEvent('navigation_request', {
    poiId,
    poiName,
    ...properties,
  });
}

/**
 * Track panel open
 */
export function trackPanelOpen(
  panelType: string,
  properties: Record<string, unknown> = {}
): void {
  trackEvent('panel_open', {
    panelType,
    ...properties,
  });
}

/**
 * Track panel close
 */
export function trackPanelClose(
  panelType: string,
  duration?: number,
  properties: Record<string, unknown> = {}
): void {
  trackEvent('panel_close', {
    panelType,
    duration,
    ...properties,
  });
}

/**
 * Force flush all pending events
 * Useful for testing or manual flush
 */
export async function forceFlush(): Promise<void> {
  await flushEvents();
}
