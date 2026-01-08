/**
 * Analytics Types for Beat Street
 *
 * Provides type definitions for engagement analytics used in sponsor reporting.
 * All analytics respect user privacy - no PII is stored, only aggregate data.
 */

/**
 * Event types that can be tracked for analytics
 */
export type EventType =
  | 'poi_view' // User viewed a POI panel
  | 'poi_click' // User clicked on a POI
  | 'session_view' // User viewed session details
  | 'session_calendar_add' // User added session to calendar
  | 'zone_enter' // User entered a zone/area
  | 'zone_exit' // User exited a zone/area
  | 'attendee_view' // User viewed an attendee profile
  | 'map_interaction' // User interacted with the map (zoom, pan)
  | 'achievement_unlock' // User unlocked an achievement
  | 'sponsor_booth_visit' // User visited a sponsor booth
  | 'panel_open' // User opened a UI panel
  | 'panel_close' // User closed a UI panel
  | 'navigation_request'; // User requested navigation to a POI

/**
 * Base analytics event structure
 * All events share these common fields
 */
export interface AnalyticsEvent {
  /** Type of event being tracked */
  eventType: EventType;
  /** Anonymous session ID (not user ID for privacy) */
  sessionId: string;
  /** When the event occurred */
  timestamp: Date;
  /** Event-specific properties */
  properties: Record<string, unknown>;
  /** Optional user ID (only if user has opted in to analytics) */
  userId?: string;
}

/**
 * POI-specific event properties
 */
export interface POIEventProperties {
  poiId: string;
  poiType: string;
  poiName: string;
  /** Duration in milliseconds for view events */
  duration?: number;
  /** Venue context */
  venueId?: string;
  /** Zone/area within venue */
  zone?: string;
  /** Floor number for indoor venues */
  floor?: number;
}

/**
 * Session-specific event properties
 */
export interface SessionEventProperties {
  sessionId: string;
  sessionTitle: string;
  sessionTrack?: string;
  speaker?: string;
  room?: string;
  action: 'view' | 'calendar_add' | 'navigate';
}

/**
 * Zone event properties for tracking movement
 */
export interface ZoneEventProperties {
  zone: string;
  previousZone?: string;
  venueId: string;
  /** Duration spent in the zone in milliseconds */
  duration?: number;
}

/**
 * Sponsor-specific event properties
 */
export interface SponsorEventProperties {
  sponsorId: string;
  sponsorName: string;
  boothId?: string;
  /** Duration of booth visit in milliseconds */
  duration?: number;
  /** Actions taken at booth */
  actions?: string[];
}

/**
 * Map interaction event properties
 */
export interface MapInteractionProperties {
  interactionType: 'zoom' | 'pan' | 'floor_change' | 'venue_change';
  zoomLevel?: number;
  floor?: number;
  venueId?: string;
}

/**
 * Analytics batch for efficient Firestore writes
 */
export interface AnalyticsBatch {
  /** Unique batch ID */
  batchId: string;
  /** Session ID for all events in batch */
  sessionId: string;
  /** Events in this batch */
  events: AnalyticsEvent[];
  /** When batch was created */
  createdAt: Date;
  /** When batch was submitted */
  submittedAt?: Date;
}

/**
 * Sponsor report data structure
 */
export interface SponsorReportData {
  sponsorId: string;
  sponsorName: string;
  /** Date range for the report */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Aggregate metrics */
  metrics: SponsorMetrics;
  /** Hourly breakdown for peak analysis */
  hourlyBreakdown: HourlyMetric[];
  /** Day-by-day breakdown */
  dailyBreakdown: DailyMetric[];
}

/**
 * Aggregate sponsor metrics
 */
export interface SponsorMetrics {
  /** Number of unique visitors (anonymous sessions) */
  uniqueVisitors: number;
  /** Total number of visits */
  totalVisits: number;
  /** Average time spent at booth in seconds */
  averageTimeSpent: number;
  /** Total time spent by all visitors in seconds */
  totalTimeSpent: number;
  /** Number of times navigated to from map */
  navigationRequests: number;
  /** Peak concurrent visitors */
  peakConcurrentVisitors: number;
}

/**
 * Hourly breakdown for peak analysis
 */
export interface HourlyMetric {
  /** Hour of day (0-23) */
  hour: number;
  /** Date for this hour */
  date: string;
  /** Visits during this hour */
  visits: number;
  /** Unique visitors during this hour */
  uniqueVisitors: number;
}

/**
 * Daily breakdown for trend analysis
 */
export interface DailyMetric {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Visits on this day */
  visits: number;
  /** Unique visitors on this day */
  uniqueVisitors: number;
  /** Average time spent in seconds */
  averageTimeSpent: number;
}

/**
 * User analytics preferences
 */
export interface AnalyticsPreferences {
  /** Whether analytics is enabled (opt-in) */
  enabled: boolean;
  /** When preference was last updated */
  updatedAt: Date;
}

/**
 * Firestore document structure for analytics events
 */
export interface AnalyticsDocument {
  /** Document ID (auto-generated) */
  id?: string;
  /** Event type */
  eventType: EventType;
  /** Session ID */
  sessionId: string;
  /** Timestamp (Firestore server timestamp) */
  timestamp: unknown; // FieldValue.serverTimestamp()
  /** Event properties */
  properties: Record<string, unknown>;
  /** Venue ID for filtering */
  venueId?: string;
  /** POI ID if relevant */
  poiId?: string;
  /** Sponsor ID if relevant */
  sponsorId?: string;
}

/**
 * Analytics aggregation for Firestore (daily summaries)
 */
export interface DailyAggregation {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Venue ID */
  venueId: string;
  /** POI or sponsor ID */
  entityId: string;
  /** Entity type (poi, sponsor, zone) */
  entityType: 'poi' | 'sponsor' | 'zone';
  /** Total events for this entity on this day */
  totalEvents: number;
  /** Unique sessions */
  uniqueSessions: number;
  /** Event type breakdown */
  eventBreakdown: Record<EventType, number>;
  /** Hourly counts */
  hourlyBreakdown: Record<number, number>;
  /** Average duration in milliseconds */
  averageDuration?: number;
  /** Last updated timestamp */
  updatedAt: unknown;
}
