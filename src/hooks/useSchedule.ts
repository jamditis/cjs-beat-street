import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Session,
  SessionWithStatus,
  SessionFilter,
  SessionTrack,
  TimeSlot,
} from '../types/schedule';
import { VenueId } from '../types/venue';
import { cjs2026Schedule } from '../data/cjs2026-schedule';
import { eventBus } from '../lib/EventBus';

/**
 * Determine the status of a session relative to the current time
 */
function getSessionStatus(
  session: Session,
  now: Date
): 'past' | 'live' | 'upcoming' {
  if (now >= session.endTime) {
    return 'past';
  }
  if (now >= session.startTime) {
    return 'live';
  }
  return 'upcoming';
}

/**
 * Calculate minutes until a session starts (negative if already started/ended)
 */
function getMinutesUntilStart(session: Session, now: Date): number {
  return Math.round((session.startTime.getTime() - now.getTime()) / 60000);
}

/**
 * Calculate minutes remaining in a live session
 */
function getMinutesRemaining(session: Session, now: Date): number | undefined {
  if (now >= session.startTime && now < session.endTime) {
    return Math.round((session.endTime.getTime() - now.getTime()) / 60000);
  }
  return undefined;
}

/**
 * Enrich a session with computed status information
 */
function enrichSession(session: Session, now: Date): SessionWithStatus {
  const status = getSessionStatus(session, now);
  return {
    ...session,
    status,
    minutesUntilStart:
      status === 'upcoming' ? getMinutesUntilStart(session, now) : undefined,
    minutesRemaining: getMinutesRemaining(session, now),
  };
}

/**
 * Check if two dates are on the same calendar day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

interface UseScheduleOptions {
  /** Auto-refresh the current time every N milliseconds (default: 60000 = 1 minute) */
  refreshInterval?: number;
  /** Initial venue filter */
  initialVenueId?: VenueId;
  /** Initial room filter */
  initialRoom?: string;
}

interface UseScheduleReturn {
  /** All sessions with status information */
  sessions: SessionWithStatus[];
  /** Sessions currently happening */
  liveSessions: SessionWithStatus[];
  /** Upcoming sessions (next 2 hours by default) */
  upcomingSessions: SessionWithStatus[];
  /** Past sessions */
  pastSessions: SessionWithStatus[];
  /** Current time used for calculations */
  currentTime: Date;
  /** Active venue filter */
  venueFilter: VenueId | null;
  /** Active room filter */
  roomFilter: string | null;
  /** Active track filter */
  trackFilter: SessionTrack | null;
  /** Set venue filter */
  setVenueFilter: (venueId: VenueId | null) => void;
  /** Set room filter */
  setRoomFilter: (room: string | null) => void;
  /** Set track filter */
  setTrackFilter: (track: SessionTrack | null) => void;
  /** Get sessions filtered by criteria */
  getFilteredSessions: (filter: SessionFilter) => SessionWithStatus[];
  /** Get sessions for a specific venue */
  getSessionsByVenue: (venueId: VenueId) => SessionWithStatus[];
  /** Get sessions for a specific room */
  getSessionsByRoom: (room: string) => SessionWithStatus[];
  /** Get sessions grouped by time slot */
  getTimeSlots: (date?: Date) => TimeSlot[];
  /** Check if a specific session is currently live */
  isSessionLive: (sessionId: string) => boolean;
  /** Get a specific session by ID */
  getSession: (sessionId: string) => SessionWithStatus | undefined;
  /** Get sessions starting within the next N minutes */
  getSessionsStartingSoon: (minutes: number) => SessionWithStatus[];
}

/**
 * Hook for managing and filtering conference schedule data
 */
export function useSchedule(options: UseScheduleOptions = {}): UseScheduleReturn {
  const { refreshInterval = 60000, initialVenueId, initialRoom } = options;

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [venueFilter, setVenueFilter] = useState<VenueId | null>(
    initialVenueId ?? null
  );
  const [roomFilter, setRoomFilter] = useState<string | null>(
    initialRoom ?? null
  );
  const [trackFilter, setTrackFilter] = useState<SessionTrack | null>(null);

  // Update current time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Listen for venue changes from EventBus
  useEffect(() => {
    const unsubscribe = eventBus.on('venue-selected', (data: unknown) => {
      const { venueId } = data as { venueId: VenueId };
      setVenueFilter(venueId);
    });

    return unsubscribe;
  }, []);

  // Enrich all sessions with status
  const sessions = useMemo(() => {
    return cjs2026Schedule.map((session) => enrichSession(session, currentTime));
  }, [currentTime]);

  // Apply active filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (venueFilter && session.venueId !== venueFilter) {
        return false;
      }
      if (roomFilter && session.room !== roomFilter) {
        return false;
      }
      if (trackFilter && session.track !== trackFilter) {
        return false;
      }
      return true;
    });
  }, [sessions, venueFilter, roomFilter, trackFilter]);

  // Categorize sessions by status
  const liveSessions = useMemo(() => {
    return filteredSessions.filter((s) => s.status === 'live');
  }, [filteredSessions]);

  const upcomingSessions = useMemo(() => {
    const twoHoursFromNow = currentTime.getTime() + 2 * 60 * 60 * 1000;
    return filteredSessions
      .filter(
        (s) =>
          s.status === 'upcoming' && s.startTime.getTime() <= twoHoursFromNow
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [filteredSessions, currentTime]);

  const pastSessions = useMemo(() => {
    return filteredSessions
      .filter((s) => s.status === 'past')
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime()); // Most recent first
  }, [filteredSessions]);

  // Get sessions with custom filter
  const getFilteredSessions = useCallback(
    (filter: SessionFilter): SessionWithStatus[] => {
      return sessions.filter((session) => {
        if (filter.venueId && session.venueId !== filter.venueId) {
          return false;
        }
        if (filter.room && session.room !== filter.room) {
          return false;
        }
        if (filter.track) {
          const tracks = Array.isArray(filter.track)
            ? filter.track
            : [filter.track];
          if (!tracks.includes(session.track as SessionTrack)) {
            return false;
          }
        }
        if (filter.date && !isSameDay(session.startTime, filter.date)) {
          return false;
        }
        if (filter.status && filter.status !== 'all') {
          if (session.status !== filter.status) {
            return false;
          }
        }
        if (filter.tags && filter.tags.length > 0) {
          const sessionTags = session.tags || [];
          if (!filter.tags.some((tag) => sessionTags.includes(tag))) {
            return false;
          }
        }
        return true;
      });
    },
    [sessions]
  );

  // Get sessions by venue
  const getSessionsByVenue = useCallback(
    (venueId: VenueId): SessionWithStatus[] => {
      return sessions.filter((s) => s.venueId === venueId);
    },
    [sessions]
  );

  // Get sessions by room
  const getSessionsByRoom = useCallback(
    (room: string): SessionWithStatus[] => {
      return sessions.filter((s) => s.room === room);
    },
    [sessions]
  );

  // Get sessions grouped by time slot
  const getTimeSlots = useCallback(
    (date?: Date): TimeSlot[] => {
      const targetSessions = date
        ? sessions.filter((s) => isSameDay(s.startTime, date))
        : sessions;

      // Group by start time
      const slotMap = new Map<string, SessionWithStatus[]>();
      targetSessions.forEach((session) => {
        const key = session.startTime.toISOString();
        if (!slotMap.has(key)) {
          slotMap.set(key, []);
        }
        slotMap.get(key)!.push(session);
      });

      // Convert to TimeSlot array
      const slots: TimeSlot[] = [];
      slotMap.forEach((slotSessions, startKey) => {
        const startTime = new Date(startKey);
        // Find the latest end time in the slot
        const endTime = new Date(
          Math.max(...slotSessions.map((s) => s.endTime.getTime()))
        );
        slots.push({
          startTime,
          endTime,
          sessions: slotSessions.sort((a, b) =>
            (a.room || '').localeCompare(b.room || '')
          ),
        });
      });

      return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    },
    [sessions]
  );

  // Check if a session is live
  const isSessionLive = useCallback(
    (sessionId: string): boolean => {
      const session = sessions.find((s) => s.id === sessionId);
      return session?.status === 'live' || false;
    },
    [sessions]
  );

  // Get a specific session
  const getSession = useCallback(
    (sessionId: string): SessionWithStatus | undefined => {
      return sessions.find((s) => s.id === sessionId);
    },
    [sessions]
  );

  // Get sessions starting soon
  const getSessionsStartingSoon = useCallback(
    (minutes: number): SessionWithStatus[] => {
      const threshold = currentTime.getTime() + minutes * 60 * 1000;
      return sessions
        .filter(
          (s) =>
            s.status === 'upcoming' &&
            s.startTime.getTime() <= threshold &&
            s.startTime.getTime() > currentTime.getTime()
        )
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    },
    [sessions, currentTime]
  );

  return {
    sessions: filteredSessions,
    liveSessions,
    upcomingSessions,
    pastSessions,
    currentTime,
    venueFilter,
    roomFilter,
    trackFilter,
    setVenueFilter,
    setRoomFilter,
    setTrackFilter,
    getFilteredSessions,
    getSessionsByVenue,
    getSessionsByRoom,
    getTimeSlots,
    isSessionLive,
    getSession,
    getSessionsStartingSoon,
  };
}

/**
 * Hook to listen for schedule-related events
 */
export function useScheduleEvents(
  onSessionSelected?: (sessionId: string, session: Session) => void
) {
  useEffect(() => {
    if (!onSessionSelected) return;

    const unsubscribe = eventBus.on('schedule-session-selected', (data: unknown) => {
      const { sessionId, session } = data as { sessionId: string; session: Session };
      onSessionSelected(sessionId, session);
    });

    return unsubscribe;
  }, [onSessionSelected]);
}
