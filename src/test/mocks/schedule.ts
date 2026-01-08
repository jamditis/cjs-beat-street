/**
 * Schedule mock factories for testing
 */
import type { Session, SessionWithStatus } from '../../types/schedule';
import { VenueId } from '../../types/venue';

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  const startTime = overrides.startTime || new Date(2026, 5, 8, 10, 0); // June 8, 2026, 10:00 AM
  const endTime = overrides.endTime || new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

  return {
    id: 'test-session-1',
    title: 'Test Session',
    description: 'A test session for unit testing',
    speaker: 'Test Speaker',
    speakerTitle: 'Test Title',
    startTime,
    endTime,
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room A',
    track: 'main',
    tags: ['test', 'mock'],
    capacity: 50,
    ...overrides,
  };
}

/**
 * Create a mock session with status
 */
export function createMockSessionWithStatus(
  overrides: Partial<SessionWithStatus> = {}
): SessionWithStatus {
  const session = createMockSession(overrides);
  return {
    ...session,
    status: overrides.status || 'upcoming',
    minutesUntilStart: overrides.minutesUntilStart,
    minutesRemaining: overrides.minutesRemaining,
  };
}

/**
 * Create a set of mock sessions for testing the schedule
 */
export function createMockSchedule(baseDate: Date = new Date(2026, 5, 8)): Session[] {
  return [
    // Keynote - 9:00 AM to 10:00 AM
    createMockSession({
      id: 'keynote-1',
      title: 'Opening Keynote',
      startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 9, 0),
      endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 10, 0),
      room: 'Main Hall',
      track: 'keynote',
      venueId: VenueId.CHAPEL_HILL,
    }),
    // Session A - 10:15 AM to 11:15 AM
    createMockSession({
      id: 'session-a',
      title: 'Session A',
      startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 10, 15),
      endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 11, 15),
      room: 'Room A',
      track: 'main',
      venueId: VenueId.CHAPEL_HILL,
    }),
    // Session B - 10:15 AM to 11:15 AM (concurrent with A)
    createMockSession({
      id: 'session-b',
      title: 'Session B',
      startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 10, 15),
      endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 11, 15),
      room: 'Room B',
      track: 'workshop',
      venueId: VenueId.PITTSBURGH,
    }),
    // Lunch - 12:30 PM to 1:30 PM
    createMockSession({
      id: 'lunch',
      title: 'Lunch Break',
      startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 30),
      endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 13, 30),
      room: 'Dining Hall',
      track: 'break',
      isBreak: true,
      venueId: VenueId.CHAPEL_HILL,
    }),
    // Afternoon session - 2:00 PM to 3:00 PM
    createMockSession({
      id: 'session-c',
      title: 'Session C',
      startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 14, 0),
      endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 15, 0),
      room: 'Room A',
      track: 'main',
      tags: ['ai', 'technology'],
      venueId: VenueId.CHAPEL_HILL,
    }),
  ];
}

/**
 * Create a session that is currently live
 */
export function createLiveSession(
  now: Date = new Date(),
  overrides: Partial<Session> = {}
): Session {
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

  return createMockSession({
    id: 'live-session',
    title: 'Currently Live Session',
    startTime: thirtyMinutesAgo,
    endTime: thirtyMinutesFromNow,
    ...overrides,
  });
}

/**
 * Create a session that is upcoming
 */
export function createUpcomingSession(
  now: Date = new Date(),
  minutesUntilStart: number = 60,
  overrides: Partial<Session> = {}
): Session {
  const startTime = new Date(now.getTime() + minutesUntilStart * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  return createMockSession({
    id: 'upcoming-session',
    title: 'Upcoming Session',
    startTime,
    endTime,
    ...overrides,
  });
}

/**
 * Create a session that has already passed
 */
export function createPastSession(
  now: Date = new Date(),
  minutesSinceEnd: number = 60,
  overrides: Partial<Session> = {}
): Session {
  const endTime = new Date(now.getTime() - minutesSinceEnd * 60 * 1000);
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);

  return createMockSession({
    id: 'past-session',
    title: 'Past Session',
    startTime,
    endTime,
    ...overrides,
  });
}
