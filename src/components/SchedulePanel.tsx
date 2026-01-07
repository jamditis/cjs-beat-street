import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  Radio,
  CalendarPlus,
  Coffee,
  Users,
  Sparkles,
  Building2,
} from 'lucide-react';
import { SessionWithStatus, SessionTrack } from '../types/schedule';
import { useSchedule } from '../hooks/useSchedule';
import { eventBus } from '../lib/EventBus';

interface SchedulePanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Room to filter by (from venue POI selection) */
  room?: string;
  /** Venue POI name for display */
  venueName?: string;
}

type TabFilter = 'now' | 'upcoming' | 'all';

/**
 * Format time for display (e.g., "9:00 AM")
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display (e.g., "Mon, Jun 8")
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get track display info (icon and label)
 */
function getTrackInfo(track?: SessionTrack): {
  icon: React.ReactNode;
  label: string;
  color: string;
} {
  switch (track) {
    case 'keynote':
      return {
        icon: <Sparkles className="w-3.5 h-3.5" />,
        label: 'Keynote',
        color: 'bg-amber-500/10 text-amber-700',
      };
    case 'workshop':
      return {
        icon: <Building2 className="w-3.5 h-3.5" />,
        label: 'Workshop',
        color: 'bg-purple-500/10 text-purple-700',
      };
    case 'networking':
      return {
        icon: <Users className="w-3.5 h-3.5" />,
        label: 'Networking',
        color: 'bg-blue-500/10 text-blue-700',
      };
    case 'sponsor':
      return {
        icon: <Building2 className="w-3.5 h-3.5" />,
        label: 'Sponsor',
        color: 'bg-emerald-500/10 text-emerald-700',
      };
    case 'break':
      return {
        icon: <Coffee className="w-3.5 h-3.5" />,
        label: 'Break',
        color: 'bg-ink/10 text-ink/70',
      };
    case 'main':
    default:
      return {
        icon: <Calendar className="w-3.5 h-3.5" />,
        label: 'Session',
        color: 'bg-teal-500/10 text-teal-700',
      };
  }
}

/**
 * Generate calendar event URL (Google Calendar)
 */
function generateCalendarUrl(session: SessionWithStatus): string {
  const title = encodeURIComponent(session.title);
  const details = encodeURIComponent(
    `${session.description}\n\n${session.speaker ? `Speaker: ${session.speaker}` : ''}`
  );
  const location = encodeURIComponent(session.room || 'CJS2026');
  const startDate = session.startTime
    .toISOString()
    .replace(/-|:|\.\d+/g, '');
  const endDate = session.endTime
    .toISOString()
    .replace(/-|:|\.\d+/g, '');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startDate}/${endDate}`;
}

/**
 * Single session card component
 */
function SessionCard({
  session,
  expanded,
  onToggle,
}: {
  session: SessionWithStatus;
  expanded: boolean;
  onToggle: () => void;
}) {
  const trackInfo = getTrackInfo(session.track);
  const isLive = session.status === 'live';
  const isPast = session.status === 'past';

  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(generateCalendarUrl(session), '_blank', 'noopener,noreferrer');
    eventBus.emit('schedule-event', {
      sessionId: session.id,
      session,
      action: 'add-to-calendar',
    });
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    eventBus.emit('schedule-navigate-to-session', {
      sessionId: session.id,
      room: session.room,
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`bg-paper rounded-lg border transition-all ${
        isLive
          ? 'border-teal-500 shadow-md shadow-teal-500/10'
          : isPast
            ? 'border-ink/10 opacity-60'
            : 'border-ink/10 hover:border-ink/20'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 rounded-lg"
        aria-expanded={expanded}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Live indicator */}
            {isLive && (
              <div className="flex items-center gap-1.5 mb-2">
                <Radio className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
                  Happening Now
                </span>
                {session.minutesRemaining && (
                  <span className="text-xs text-ink/50">
                    ({session.minutesRemaining} min left)
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            <h4
              className={`font-semibold text-ink leading-tight ${
                isPast ? 'line-through decoration-ink/30' : ''
              }`}
            >
              {session.title}
            </h4>

            {/* Time */}
            <div className="flex items-center gap-2 mt-2 text-sm text-ink/70">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {formatTime(session.startTime)} - {formatTime(session.endTime)}
              </span>
            </div>
          </div>

          {/* Track badge and expand icon */}
          <div className="flex items-start gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trackInfo.color}`}
            >
              {trackInfo.icon}
              <span className="hidden sm:inline">{trackInfo.label}</span>
            </span>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              className="text-ink/40"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-ink/5 pt-3">
              {/* Description */}
              <p className="text-sm text-ink/80 leading-relaxed">
                {session.description}
              </p>

              {/* Speaker */}
              {session.speaker && (
                <div className="flex items-start gap-2 text-sm">
                  <User className="w-4 h-4 text-ink/50 mt-0.5" />
                  <div>
                    <span className="font-medium text-ink">
                      {session.speaker}
                    </span>
                    {session.speakerTitle && (
                      <span className="text-ink/60">
                        {' '}
                        - {session.speakerTitle}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Room */}
              {session.room && (
                <div className="flex items-center gap-2 text-sm text-ink/70">
                  <MapPin className="w-4 h-4" />
                  <span>{session.room}</span>
                </div>
              )}

              {/* Tags */}
              {session.tags && session.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {session.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-cream text-ink/60 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              {!isPast && !session.isBreak && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleAddToCalendar}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cream hover:bg-parchment rounded-lg text-sm font-medium text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Add to Calendar
                  </button>
                  {session.room && (
                    <button
                      onClick={handleNavigate}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Navigate
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Schedule panel showing sessions at a venue/room
 */
export function SchedulePanel({
  isOpen,
  onClose,
  room,
  venueName,
}: SchedulePanelProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('now');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const {
    liveSessions,
    upcomingSessions,
    pastSessions,
    currentTime,
  } = useSchedule();

  // Filter sessions by room if provided
  const filteredSessions = room
    ? {
        live: liveSessions.filter((s) => s.room === room),
        upcoming: upcomingSessions.filter((s) => s.room === room),
        past: pastSessions.filter((s) => s.room === room),
      }
    : {
        live: liveSessions,
        upcoming: upcomingSessions,
        past: pastSessions,
      };

  // Get sessions for current tab
  const displaySessions = (() => {
    switch (activeTab) {
      case 'now':
        return filteredSessions.live;
      case 'upcoming':
        return filteredSessions.upcoming;
      case 'all':
        return [
          ...filteredSessions.live,
          ...filteredSessions.upcoming,
          ...filteredSessions.past,
        ];
      default:
        return [];
    }
  })();

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Auto-expand the first live session
  useEffect(() => {
    if (isOpen && filteredSessions.live.length > 0 && !expandedId) {
      setExpandedId(filteredSessions.live[0].id);
    }
  }, [isOpen, filteredSessions.live, expandedId]);

  // Reset expanded state when room changes
  useEffect(() => {
    setExpandedId(null);
    // Default to 'now' if there are live sessions, otherwise 'upcoming'
    if (filteredSessions.live.length > 0) {
      setActiveTab('now');
    } else if (filteredSessions.upcoming.length > 0) {
      setActiveTab('upcoming');
    } else {
      setActiveTab('all');
    }
  }, [room]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-full sm:w-96 max-w-[calc(100vw-1rem)] bg-cream shadow-xl z-50 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-panel-title"
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-ink/10 bg-paper">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-teal-600 mb-1">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    Schedule
                  </span>
                </div>
                <h2
                  id="schedule-panel-title"
                  className="font-display text-xl text-ink"
                >
                  {venueName || room || 'All Sessions'}
                </h2>
                <p className="text-xs text-ink/50 mt-1">
                  {formatDate(currentTime)} - Updated{' '}
                  {formatTime(currentTime)}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close schedule panel"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            {/* Tab filters */}
            <div className="flex gap-1 mt-4 bg-cream rounded-lg p-1">
              {[
                { id: 'now' as const, label: 'Now', count: filteredSessions.live.length },
                { id: 'upcoming' as const, label: 'Upcoming', count: filteredSessions.upcoming.length },
                { id: 'all' as const, label: 'All', count: filteredSessions.live.length + filteredSessions.upcoming.length + filteredSessions.past.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 ${
                    activeTab === tab.id
                      ? 'bg-paper text-ink shadow-sm'
                      : 'text-ink/60 hover:text-ink hover:bg-paper/50'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                        activeTab === tab.id
                          ? 'bg-teal-600 text-white'
                          : 'bg-ink/10 text-ink/60'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displaySessions.length === 0 ? (
              <div className="text-center py-12 text-ink/50">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No sessions</p>
                <p className="text-sm mt-1">
                  {activeTab === 'now'
                    ? 'Nothing happening right now'
                    : activeTab === 'upcoming'
                      ? 'No upcoming sessions'
                      : 'No sessions found'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {displaySessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    expanded={expandedId === session.id}
                    onToggle={() =>
                      setExpandedId(
                        expandedId === session.id ? null : session.id
                      )
                    }
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer with live session alert */}
          {filteredSessions.live.length > 0 && activeTab !== 'now' && (
            <div className="flex-shrink-0 p-4 bg-teal-600/10 border-t border-teal-500/20">
              <button
                onClick={() => setActiveTab('now')}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors focus:outline-none focus:underline"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                {filteredSessions.live.length} session
                {filteredSessions.live.length !== 1 ? 's' : ''} happening now
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
