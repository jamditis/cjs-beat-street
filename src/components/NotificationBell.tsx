import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Check,
  X,
  Calendar,
  Trophy,
  Users,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Notification, NotificationType } from '../types/notification';

interface NotificationBellProps {
  /** Callback when "View All" is clicked */
  onViewAll?: () => void;
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
function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'session_reminder':
      return 'bg-teal-500/10 text-teal-600';
    case 'achievement':
      return 'bg-amber-500/10 text-amber-600';
    case 'networking':
      return 'bg-blue-500/10 text-blue-600';
    case 'announcement':
      return 'bg-purple-500/10 text-purple-600';
    default:
      return 'bg-ink/10 text-ink';
  }
}

/**
 * Format relative time (e.g., "2 min ago", "1 hour ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} min ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

/**
 * Single notification item in dropdown
 */
function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const Icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`relative flex gap-3 p-3 hover:bg-parchment/50 transition-colors ${
        !notification.read ? 'bg-teal-50/30' : ''
      }`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium text-ink ${!notification.read ? 'font-semibold' : ''}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 bg-teal-500 rounded-full mt-1.5" />
          )}
        </div>
        <p className="text-xs text-ink/70 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-ink/50 mt-1">{formatRelativeTime(notification.timestamp)}</p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="p-1 rounded hover:bg-cream transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5 text-teal-600" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
          className="p-1 rounded hover:bg-cream transition-colors"
          title="Remove"
        >
          <X className="w-3.5 h-3.5 text-ink/50" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Notification bell with badge and dropdown
 */
export function NotificationBell({ onViewAll }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    remove,
    preferences,
  } = useNotifications();

  // Recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    },
    []
  );

  // Request permission if not granted
  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 bg-paper/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-paper transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {preferences.enabled ? (
          <Bell className="w-5 h-5 text-ink" />
        ) : (
          <BellOff className="w-5 h-5 text-ink/50" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-teal-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onKeyDown={handleKeyDown}
            className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-paper rounded-xl shadow-xl border border-ink/10 overflow-hidden z-50"
            role="menu"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10 bg-cream/50">
              <h3 className="font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium focus:outline-none focus:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Permission prompt */}
            {permission !== 'granted' && (
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-xs text-amber-800 mb-2">
                  Enable notifications to get session reminders
                </p>
                <button
                  onClick={handleEnableNotifications}
                  className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 focus:outline-none focus:underline"
                >
                  <Bell className="w-3 h-3" />
                  Enable Notifications
                </button>
              </div>
            )}

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-ink/5">
              {recentNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-ink/20" />
                  <p className="text-sm text-ink/50">No notifications yet</p>
                  <p className="text-xs text-ink/40 mt-1">
                    Session reminders and achievements will appear here
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {recentNotifications.map((notification) => (
                    <div key={notification.id} className="group">
                      <NotificationItem
                        notification={notification}
                        onMarkRead={markAsRead}
                        onRemove={remove}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-ink/10 bg-cream/30">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onViewAll?.();
                  }}
                  className="w-full flex items-center justify-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium focus:outline-none focus:underline"
                >
                  View all notifications
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
