import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  Calendar,
  Trophy,
  Users,
  Megaphone,
  Check,
  Trash2,
  Filter,
  CheckCheck,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Notification, NotificationType } from '../types/notification';

interface NotificationPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Callback to open settings */
  onOpenSettings?: () => void;
}

/**
 * Get icon component for notification type
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'session_reminder':
      return Calendar;
    case 'achievement':
      return Trophy;
    case 'networking':
      return Users;
    case 'announcement':
      return Megaphone;
    default:
      return Bell;
  }
}

/**
 * Get color classes for notification type
 */
function getNotificationColor(type: NotificationType): {
  bg: string;
  text: string;
  badge: string;
} {
  switch (type) {
    case 'session_reminder':
      return {
        bg: 'bg-teal-500/10',
        text: 'text-teal-600',
        badge: 'bg-teal-100 text-teal-700',
      };
    case 'achievement':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-700',
      };
    case 'networking':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
      };
    case 'announcement':
      return {
        bg: 'bg-purple-500/10',
        text: 'text-purple-600',
        badge: 'bg-purple-100 text-purple-700',
      };
    default:
      return {
        bg: 'bg-ink/10',
        text: 'text-ink',
        badge: 'bg-ink/10 text-ink',
      };
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isYesterday =
    date.getDate() === now.getDate() - 1 &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get human-readable type label
 */
function getTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'session_reminder':
      return 'Session';
    case 'achievement':
      return 'Achievement';
    case 'networking':
      return 'Networking';
    case 'announcement':
      return 'Announcement';
    default:
      return 'Notification';
  }
}

/**
 * Filter dropdown component
 */
function FilterDropdown({
  activeType,
  onSelect,
}: {
  activeType: NotificationType | null;
  onSelect: (type: NotificationType | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { value: NotificationType | null; label: string; icon: React.ElementType }[] = [
    { value: null, label: 'All Types', icon: Bell },
    { value: 'session_reminder', label: 'Sessions', icon: Calendar },
    { value: 'achievement', label: 'Achievements', icon: Trophy },
    { value: 'networking', label: 'Networking', icon: Users },
    { value: 'announcement', label: 'Announcements', icon: Megaphone },
  ];

  const activeOption = options.find((o) => o.value === activeType) || options[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-cream rounded-lg text-sm font-medium text-ink hover:bg-parchment transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Filter className="w-4 h-4" />
        <span>{activeOption.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 mt-2 w-48 bg-paper rounded-lg shadow-lg border border-ink/10 py-1 z-10"
            role="listbox"
          >
            {options.map((option) => {
              const Icon = option.icon;
              const isActive = activeType === option.value;
              return (
                <li key={option.value ?? 'all'}>
                  <button
                    onClick={() => {
                      onSelect(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-ink hover:bg-cream'
                    }`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{option.label}</span>
                    {isActive && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Single notification card
 */
function NotificationCard({
  notification,
  onMarkRead,
  onRemove,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const Icon = getNotificationIcon(notification.type);
  const colors = getNotificationColor(notification.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`bg-paper rounded-lg border transition-all ${
        !notification.read
          ? 'border-teal-500/30 shadow-sm'
          : 'border-ink/10'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colors.bg}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                {getTypeLabel(notification.type)}
              </span>
              {!notification.read && (
                <span className="text-xs font-semibold text-teal-600">New</span>
              )}
            </div>
            <h4 className="font-semibold text-ink">{notification.title}</h4>
            <p className="text-sm text-ink/70 mt-1">{notification.message}</p>
            <p className="text-xs text-ink/50 mt-2">
              {formatTimestamp(notification.timestamp)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-ink/5">
          {!notification.read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <Check className="w-4 h-4" />
              Mark as read
            </button>
          )}
          <button
            onClick={() => onRemove(notification.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink/60 hover:text-ink hover:bg-cream rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink/20"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Full notification panel component
 */
export function NotificationPanel({
  isOpen,
  onClose,
  onOpenSettings,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filterType, setFilterType] = useState<NotificationType | null>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    remove,
    clearAll,
    setFilter,
  } = useNotifications();

  // Apply filter when filterType changes
  useEffect(() => {
    setFilter(filterType ? { type: filterType } : {});
  }, [filterType, setFilter]);

  // Get filtered notifications
  const filteredNotifications = filterType
    ? notifications.filter((n) => n.type === filterType)
    : notifications;

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Focus management
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-full sm:w-[28rem] max-w-[calc(100vw-1rem)] bg-cream shadow-xl z-50 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-panel-title"
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-ink/10 bg-paper">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-teal-600 mb-1">
                  <Bell className="w-5 h-5" />
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    Notifications
                  </span>
                </div>
                <h2
                  id="notification-panel-title"
                  className="font-display text-xl text-ink"
                >
                  {unreadCount > 0 ? `${unreadCount} Unread` : 'All Caught Up'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                    aria-label="Notification settings"
                  >
                    <Settings className="w-5 h-5 text-ink/60" />
                  </button>
                )}
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                  aria-label="Close notifications panel"
                >
                  <X className="w-5 h-5 text-ink" />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mt-4">
              <FilterDropdown
                activeType={filterType}
                onSelect={setFilterType}
              />

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink/60 hover:text-ink hover:bg-cream rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear all</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-ink/50">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  {filterType ? 'No notifications of this type' : 'No notifications'}
                </p>
                <p className="text-sm mt-1">
                  {filterType
                    ? 'Try a different filter or check back later'
                    : 'Session reminders and achievements will appear here'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onRemove={remove}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
