/**
 * Schedule type definitions for CJS2026 conference sessions
 */

import { VenueId } from './venue';

/**
 * Session track categories
 */
export type SessionTrack =
  | 'main'
  | 'workshop'
  | 'networking'
  | 'sponsor'
  | 'break'
  | 'keynote';

/**
 * Conference session definition
 */
export interface Session {
  id: string;
  title: string;
  description: string;
  speaker?: string;
  speakerTitle?: string;
  startTime: Date;
  endTime: Date;
  venueId: VenueId;
  room?: string;
  track?: SessionTrack;
  tags?: string[];
  capacity?: number;
  isBreak?: boolean; // Marks lunch, coffee breaks, etc.
}

/**
 * Session with computed status information
 */
export interface SessionWithStatus extends Session {
  status: 'past' | 'live' | 'upcoming';
  minutesUntilStart?: number;
  minutesRemaining?: number;
}

/**
 * Filter options for querying sessions
 */
export interface SessionFilter {
  venueId?: VenueId;
  room?: string;
  track?: SessionTrack | SessionTrack[];
  date?: Date;
  status?: 'past' | 'live' | 'upcoming' | 'all';
  tags?: string[];
}

/**
 * Time slot grouping for schedule display
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  sessions: SessionWithStatus[];
}

/**
 * Schedule event payload for EventBus
 */
export interface ScheduleEventData {
  sessionId: string;
  session: Session;
  action: 'view' | 'navigate' | 'add-to-calendar';
}
