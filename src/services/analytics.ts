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

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30000;
const ANALYTICS_COLLECTION = 'analytics_events';
const ANALYTICS_PREFERENCES_KEY = 'beat-street-analytics-consent';
const SESSION_ID_KEY = 'beat-street-session-id';

function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

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

export function initAnalytics(): void {
  const prefs = getAnalyticsPreferences();
  state.enabled = prefs.enabled;
  state.sessionId = getSessionId();

  if (state.enabled) {
    startFlushInterval();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);
  }
}

export function destroyAnalytics(): void {
  stopFlushInterval();

  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  flushEvents();
}

function handleBeforeUnload(): void {
  if (state.eventQueue.length > 0 && state.enabled) {
    flushEvents();
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden' && state.eventQueue.length > 0) {
    flushEvents();
  }
}

function startFlushInterval(): void {
  if (state.flushTimer) return;

  state.flushTimer = setInterval(() => {
    if (state.eventQueue.length > 0) {
      flushEvents();
    }
  }, FLUSH_INTERVAL_MS);
}

function stopFlushInterval(): void {
  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }
}

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
    state.eventQueue = [];
  }
}

export function isAnalyticsEnabled(): boolean {
  return state.enabled;
}

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

  if (state.eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  }
}

async function flushEvents(): Promise<void> {
  if (state.eventQueue.length === 0 || !state.enabled) {
    return;
  }

  const events = [...state.eventQueue];
  state.eventQueue = [];

  try {
    const batch = writeBatch(db);

    events.forEach((event) => {
      const docRef = doc(collection(db, ANALYTICS_COLLECTION));
      const cleanedProperties = removeUndefined(event.properties);
      const docData = removeUndefined({
        eventType: event.eventType,
        sessionId: event.sessionId,
        timestamp: serverTimestamp(),
        properties: cleanedProperties,
        venueId: event.properties.venueId as string | undefined,
        poiId: event.properties.poiId as string | undefined,
        sponsorId: event.properties.sponsorId as string | undefined,
      }) as AnalyticsDocument;
      batch.set(docRef, docData);
    });

    await batch.commit();
  } catch (error) {
    console.error('[analytics] Failed to flush events:', error);
    state.eventQueue = [...events, ...state.eventQueue];
  }
}

export function trackPOIView(properties: POIEventProperties): void {
  state.poiViewStartTime.set(properties.poiId, Date.now());
  trackEvent('poi_view', { ...properties, startTime: Date.now() });
}

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

export function trackPOIClick(properties: POIEventProperties): void {
  trackEvent('poi_click', properties as unknown as Record<string, unknown>);
}

export function trackSessionView(properties: SessionEventProperties): void {
  trackEvent('session_view', properties as unknown as Record<string, unknown>);
}

export function trackSessionCalendarAdd(properties: SessionEventProperties): void {
  trackEvent('session_calendar_add', {
    ...(properties as unknown as Record<string, unknown>),
    action: 'calendar_add',
  });
}

export function trackZoneEnter(properties: ZoneEventProperties): void {
  state.zoneEntryTime.set(properties.zone, Date.now());
  trackEvent('zone_enter', { ...properties, entryTime: Date.now() });
}

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

export function trackSponsorBoothVisit(properties: SponsorEventProperties): void {
  trackEvent('sponsor_booth_visit', properties as unknown as Record<string, unknown>);
}

export function trackMapInteraction(properties: MapInteractionProperties): void {
  trackEvent('map_interaction', properties as unknown as Record<string, unknown>);
}

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

export function trackAttendeeView(attendeeUid: string, context?: string): void {
  trackEvent('attendee_view', {
    targetUid: attendeeUid,
    context,
  });
}

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

export function trackPanelOpen(
  panelType: string,
  properties: Record<string, unknown> = {}
): void {
  trackEvent('panel_open', {
    panelType,
    ...properties,
  });
}

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

export async function forceFlush(): Promise<void> {
  await flushEvents();
}
