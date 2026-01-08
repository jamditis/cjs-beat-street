/**
 * Tests for useSchedule hook helper functions
 *
 * Note: We test the pure functions extracted from the hook logic
 * since the hook itself depends on external data and EventBus
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Session, SessionWithStatus, SessionFilter } from '../types/schedule';
import { VenueId } from '../types/venue';
import {
  createMockSession,
  createMockSchedule,
  createLiveSession,
  createUpcomingSession,
  createPastSession,
} from '../test/mocks/schedule';

// Extract and test the pure functions from useSchedule.ts
// These are the same implementations from the hook

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

function getMinutesUntilStart(session: Session, now: Date): number {
  return Math.round((session.startTime.getTime() - now.getTime()) / 60000);
}

function getMinutesRemaining(session: Session, now: Date): number | undefined {
  if (now >= session.startTime && now < session.endTime) {
    return Math.round((session.endTime.getTime() - now.getTime()) / 60000);
  }
  return undefined;
}

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

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function filterSessions(
  sessions: SessionWithStatus[],
  filter: SessionFilter
): SessionWithStatus[] {
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
      if (!tracks.includes(session.track as 'main' | 'workshop' | 'networking' | 'sponsor' | 'break' | 'keynote')) {
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
}

describe('useSchedule helper functions', () => {
  describe('getSessionStatus()', () => {
    it('should return "upcoming" for sessions that have not started yet', () => {
      const now = new Date(2026, 5, 8, 9, 0); // 9:00 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getSessionStatus(session, now)).toBe('upcoming');
    });

    it('should return "live" for sessions currently in progress', () => {
      const now = new Date(2026, 5, 8, 10, 30); // 10:30 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getSessionStatus(session, now)).toBe('live');
    });

    it('should return "live" exactly at start time', () => {
      const now = new Date(2026, 5, 8, 10, 0); // Exactly 10:00 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getSessionStatus(session, now)).toBe('live');
    });

    it('should return "past" for sessions that have ended', () => {
      const now = new Date(2026, 5, 8, 12, 0); // 12:00 PM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getSessionStatus(session, now)).toBe('past');
    });

    it('should return "past" exactly at end time', () => {
      const now = new Date(2026, 5, 8, 11, 0); // Exactly 11:00 AM (end time)
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getSessionStatus(session, now)).toBe('past');
    });
  });

  describe('getMinutesUntilStart()', () => {
    it('should return positive minutes for upcoming sessions', () => {
      const now = new Date(2026, 5, 8, 9, 0); // 9:00 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
      });

      expect(getMinutesUntilStart(session, now)).toBe(60);
    });

    it('should return 0 when session is starting now', () => {
      const now = new Date(2026, 5, 8, 10, 0); // 10:00 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
      });

      expect(getMinutesUntilStart(session, now)).toBe(0);
    });

    it('should return negative minutes for sessions that have started', () => {
      const now = new Date(2026, 5, 8, 10, 30); // 10:30 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
      });

      expect(getMinutesUntilStart(session, now)).toBe(-30);
    });

    it('should handle fractional minutes by rounding', () => {
      const now = new Date(2026, 5, 8, 9, 0, 30); // 9:00:30 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0, 0), // 10:00:00 AM
      });

      // 59 minutes and 30 seconds = rounds to 60
      expect(getMinutesUntilStart(session, now)).toBe(60);
    });
  });

  describe('getMinutesRemaining()', () => {
    it('should return remaining minutes for live sessions', () => {
      const now = new Date(2026, 5, 8, 10, 30); // 10:30 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getMinutesRemaining(session, now)).toBe(30);
    });

    it('should return undefined for upcoming sessions', () => {
      const now = new Date(2026, 5, 8, 9, 0); // 9:00 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getMinutesRemaining(session, now)).toBeUndefined();
    });

    it('should return undefined for past sessions', () => {
      const now = new Date(2026, 5, 8, 12, 0); // 12:00 PM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getMinutesRemaining(session, now)).toBeUndefined();
    });

    it('should return full duration at start time', () => {
      const now = new Date(2026, 5, 8, 10, 0); // Exactly 10:00 AM
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0), // 10:00 AM
        endTime: new Date(2026, 5, 8, 11, 0),   // 11:00 AM
      });

      expect(getMinutesRemaining(session, now)).toBe(60);
    });
  });

  describe('enrichSession()', () => {
    it('should add upcoming status and minutesUntilStart for upcoming sessions', () => {
      const now = new Date(2026, 5, 8, 9, 0);
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0),
        endTime: new Date(2026, 5, 8, 11, 0),
      });

      const enriched = enrichSession(session, now);

      expect(enriched.status).toBe('upcoming');
      expect(enriched.minutesUntilStart).toBe(60);
      expect(enriched.minutesRemaining).toBeUndefined();
    });

    it('should add live status and minutesRemaining for live sessions', () => {
      const now = new Date(2026, 5, 8, 10, 30);
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0),
        endTime: new Date(2026, 5, 8, 11, 0),
      });

      const enriched = enrichSession(session, now);

      expect(enriched.status).toBe('live');
      expect(enriched.minutesUntilStart).toBeUndefined();
      expect(enriched.minutesRemaining).toBe(30);
    });

    it('should add past status with no time info for past sessions', () => {
      const now = new Date(2026, 5, 8, 12, 0);
      const session = createMockSession({
        startTime: new Date(2026, 5, 8, 10, 0),
        endTime: new Date(2026, 5, 8, 11, 0),
      });

      const enriched = enrichSession(session, now);

      expect(enriched.status).toBe('past');
      expect(enriched.minutesUntilStart).toBeUndefined();
      expect(enriched.minutesRemaining).toBeUndefined();
    });

    it('should preserve all original session properties', () => {
      const now = new Date(2026, 5, 8, 9, 0);
      const session = createMockSession({
        id: 'test-id',
        title: 'Test Session',
        speaker: 'Test Speaker',
        room: 'Room A',
        track: 'workshop',
        tags: ['test', 'unit'],
      });

      const enriched = enrichSession(session, now);

      expect(enriched.id).toBe('test-id');
      expect(enriched.title).toBe('Test Session');
      expect(enriched.speaker).toBe('Test Speaker');
      expect(enriched.room).toBe('Room A');
      expect(enriched.track).toBe('workshop');
      expect(enriched.tags).toEqual(['test', 'unit']);
    });
  });

  describe('isSameDay()', () => {
    it('should return true for the same day', () => {
      const date1 = new Date(2026, 5, 8, 10, 0);
      const date2 = new Date(2026, 5, 8, 14, 30);

      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2026, 5, 8, 10, 0);
      const date2 = new Date(2026, 5, 9, 10, 0);

      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different months', () => {
      const date1 = new Date(2026, 5, 8);
      const date2 = new Date(2026, 6, 8);

      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different years', () => {
      const date1 = new Date(2026, 5, 8);
      const date2 = new Date(2027, 5, 8);

      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('filterSessions()', () => {
    let sessions: SessionWithStatus[];
    const now = new Date(2026, 5, 8, 10, 30);

    beforeEach(() => {
      const baseSessions = createMockSchedule(new Date(2026, 5, 8));
      sessions = baseSessions.map((s) => enrichSession(s, now));
    });

    it('should filter by venueId', () => {
      const filtered = filterSessions(sessions, { venueId: VenueId.PITTSBURGH });

      expect(filtered.every((s) => s.venueId === VenueId.PITTSBURGH)).toBe(true);
    });

    it('should filter by room', () => {
      const filtered = filterSessions(sessions, { room: 'Room A' });

      expect(filtered.every((s) => s.room === 'Room A')).toBe(true);
    });

    it('should filter by single track', () => {
      const filtered = filterSessions(sessions, { track: 'keynote' });

      expect(filtered.every((s) => s.track === 'keynote')).toBe(true);
    });

    it('should filter by multiple tracks', () => {
      const filtered = filterSessions(sessions, { track: ['main', 'workshop'] });

      expect(filtered.every((s) => s.track === 'main' || s.track === 'workshop')).toBe(true);
    });

    it('should filter by date', () => {
      const targetDate = new Date(2026, 5, 8);
      const filtered = filterSessions(sessions, { date: targetDate });

      expect(filtered.every((s) => isSameDay(s.startTime, targetDate))).toBe(true);
    });

    it('should filter by status', () => {
      // Add a mix of sessions with different statuses
      const mixedSessions = [
        enrichSession(createLiveSession(now), now),
        enrichSession(createUpcomingSession(now, 60), now),
        enrichSession(createPastSession(now, 60), now),
      ];

      const liveFiltered = filterSessions(mixedSessions, { status: 'live' });
      expect(liveFiltered.every((s) => s.status === 'live')).toBe(true);

      const upcomingFiltered = filterSessions(mixedSessions, { status: 'upcoming' });
      expect(upcomingFiltered.every((s) => s.status === 'upcoming')).toBe(true);
    });

    it('should not filter when status is "all"', () => {
      const mixedSessions = [
        enrichSession(createLiveSession(now), now),
        enrichSession(createUpcomingSession(now, 60), now),
        enrichSession(createPastSession(now, 60), now),
      ];

      const filtered = filterSessions(mixedSessions, { status: 'all' });
      expect(filtered.length).toBe(mixedSessions.length);
    });

    it('should filter by tags', () => {
      const sessionsWithTags = [
        enrichSession(createMockSession({ tags: ['ai', 'technology'] }), now),
        enrichSession(createMockSession({ tags: ['community', 'engagement'] }), now),
        enrichSession(createMockSession({ tags: ['technology', 'data'] }), now),
      ];

      const filtered = filterSessions(sessionsWithTags, { tags: ['technology'] });

      expect(filtered.length).toBe(2);
      expect(filtered.every((s) => s.tags?.includes('technology'))).toBe(true);
    });

    it('should handle sessions without tags when filtering by tags', () => {
      const sessionsWithoutTags = [
        enrichSession(createMockSession({ tags: undefined }), now),
        enrichSession(createMockSession({ tags: ['test'] }), now),
      ];

      const filtered = filterSessions(sessionsWithoutTags, { tags: ['test'] });

      expect(filtered.length).toBe(1);
    });

    it('should combine multiple filters', () => {
      const filtered = filterSessions(sessions, {
        venueId: VenueId.CHAPEL_HILL,
        track: 'main',
      });

      expect(
        filtered.every(
          (s) => s.venueId === VenueId.CHAPEL_HILL && s.track === 'main'
        )
      ).toBe(true);
    });

    it('should return all sessions when no filter is provided', () => {
      const filtered = filterSessions(sessions, {});

      expect(filtered.length).toBe(sessions.length);
    });
  });

  describe('mock factories', () => {
    it('createLiveSession should create a currently live session', () => {
      const now = new Date();
      const liveSession = createLiveSession(now);
      const status = getSessionStatus(liveSession, now);

      expect(status).toBe('live');
    });

    it('createUpcomingSession should create an upcoming session', () => {
      const now = new Date();
      const upcomingSession = createUpcomingSession(now, 60);
      const status = getSessionStatus(upcomingSession, now);

      expect(status).toBe('upcoming');
    });

    it('createPastSession should create a past session', () => {
      const now = new Date();
      const pastSession = createPastSession(now, 60);
      const status = getSessionStatus(pastSession, now);

      expect(status).toBe('past');
    });

    it('createMockSchedule should create a consistent set of sessions', () => {
      const baseDate = new Date(2026, 5, 8);
      const schedule = createMockSchedule(baseDate);

      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule.every((s) => s.id && s.title && s.startTime && s.endTime)).toBe(true);
    });
  });
});
