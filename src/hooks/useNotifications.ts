/**
 * React hook for managing notifications in Beat Street
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Notification,
  NotificationPreferences,
  NotificationFilter,
  ScheduledReminder,
} from '../types/notification';
import { Session } from '../types/schedule';
import {
  getStoredNotifications,
  getNotificationPreferences,
  saveNotificationPreferences,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearAllNotifications,
  scheduleSessionReminder,
  cancelSessionReminder,
  hasReminderForSession,
  getReminderForSession,
  getStoredReminders,
  initializeReminders,
  requestNotificationPermission,
  getNotificationPermission,
  cleanupNotifications,
} from '../services/notifications';
import { eventBus } from '../lib/EventBus';

interface UseNotificationsReturn {
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  filteredNotifications: Notification[];

  // Permission
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;

  // Preferences
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;

  // Actions
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  remove: (notificationId: string) => void;
  clearAll: () => void;

  // Reminders
  reminders: ScheduledReminder[];
  scheduleReminder: (session: Session, minutesBefore?: number) => ScheduledReminder | null;
  cancelReminder: (sessionId: string) => void;
  hasReminder: (sessionId: string) => boolean;
  getReminder: (sessionId: string) => ScheduledReminder | undefined;

  // Filtering
  setFilter: (filter: NotificationFilter) => void;
  filter: NotificationFilter;
}

/**
 * Hook for managing notifications, reminders, and preferences
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    getNotificationPreferences
  );
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission
  );
  const [filter, setFilter] = useState<NotificationFilter>({});

  // Initialize on mount
  useEffect(() => {
    // Load initial state
    setNotifications(getStoredNotifications());
    setReminders(getStoredReminders());
    setPreferences(getNotificationPreferences());
    setPermission(getNotificationPermission());

    // Initialize reminder timers
    initializeReminders();

    // Cleanup on unmount
    return () => {
      cleanupNotifications();
    };
  }, []);

  // Subscribe to notification events
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Notification added
    unsubscribers.push(
      eventBus.on('notification-added', () => {
        setNotifications(getStoredNotifications());
      })
    );

    // Notification read
    unsubscribers.push(
      eventBus.on('notification-read', () => {
        setNotifications(getStoredNotifications());
      })
    );

    // All notifications read
    unsubscribers.push(
      eventBus.on('notifications-all-read', () => {
        setNotifications(getStoredNotifications());
      })
    );

    // Notification removed
    unsubscribers.push(
      eventBus.on('notification-removed', () => {
        setNotifications(getStoredNotifications());
      })
    );

    // All notifications cleared
    unsubscribers.push(
      eventBus.on('notifications-cleared', () => {
        setNotifications([]);
      })
    );

    // Reminder scheduled
    unsubscribers.push(
      eventBus.on('reminder-scheduled', () => {
        setReminders(getStoredReminders());
      })
    );

    // Reminder cancelled
    unsubscribers.push(
      eventBus.on('reminder-cancelled', () => {
        setReminders(getStoredReminders());
      })
    );

    // Preferences changed
    unsubscribers.push(
      eventBus.on('notification-preferences-changed', (prefs: unknown) => {
        setPreferences(prefs as NotificationPreferences);
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Apply filter to notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      // Filter by type
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        if (!types.includes(notification.type)) {
          return false;
        }
      }

      // Filter by read status
      if (filter.read !== undefined && notification.read !== filter.read) {
        return false;
      }

      // Filter by date range
      if (filter.fromDate && notification.timestamp < filter.fromDate) {
        return false;
      }
      if (filter.toDate && notification.timestamp > filter.toDate) {
        return false;
      }

      return true;
    });
  }, [notifications, filter]);

  // Request notification permission
  const requestPermissionHandler = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  // Update preferences
  const updatePreferences = useCallback(
    (prefs: Partial<NotificationPreferences>) => {
      saveNotificationPreferences(prefs);
      setPreferences((current) => ({ ...current, ...prefs }));
    },
    []
  );

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    markNotificationRead(notificationId);
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    markAllNotificationsRead();
  }, []);

  // Remove notification
  const remove = useCallback((notificationId: string) => {
    removeNotification(notificationId);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    clearAllNotifications();
  }, []);

  // Schedule a reminder
  const scheduleReminder = useCallback(
    (session: Session, minutesBefore?: number) => {
      const mins = minutesBefore ?? preferences.defaultReminderMinutes;
      return scheduleSessionReminder(session, mins);
    },
    [preferences.defaultReminderMinutes]
  );

  // Cancel a reminder
  const cancelReminderHandler = useCallback((sessionId: string) => {
    cancelSessionReminder(sessionId);
  }, []);

  // Check if session has a reminder
  const hasReminder = useCallback((sessionId: string) => {
    return hasReminderForSession(sessionId);
  }, []);

  // Get reminder for session
  const getReminder = useCallback((sessionId: string) => {
    return getReminderForSession(sessionId);
  }, []);

  return {
    // Notifications
    notifications,
    unreadCount,
    filteredNotifications,

    // Permission
    permission,
    requestPermission: requestPermissionHandler,

    // Preferences
    preferences,
    updatePreferences,

    // Actions
    markAsRead,
    markAllAsRead,
    remove,
    clearAll,

    // Reminders
    reminders,
    scheduleReminder,
    cancelReminder: cancelReminderHandler,
    hasReminder,
    getReminder,

    // Filtering
    setFilter,
    filter,
  };
}

/**
 * Hook for listening to specific notification events
 */
export function useNotificationEvents(handlers: {
  onNotificationAdded?: (notification: Notification) => void;
  onAchievementUnlocked?: (data: {
    achievementId: string;
    achievementName: string;
    description: string;
    iconUrl?: string;
  }) => void;
  onSessionReminderTriggered?: (data: {
    reminder: ScheduledReminder;
  }) => void;
}) {
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (handlers.onNotificationAdded) {
      unsubscribers.push(
        eventBus.on('notification-added', handlers.onNotificationAdded as (...args: unknown[]) => void)
      );
    }

    if (handlers.onAchievementUnlocked) {
      unsubscribers.push(
        eventBus.on('achievement-unlocked', handlers.onAchievementUnlocked as (...args: unknown[]) => void)
      );
    }

    if (handlers.onSessionReminderTriggered) {
      unsubscribers.push(
        eventBus.on('session-reminder-triggered', handlers.onSessionReminderTriggered as (...args: unknown[]) => void)
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [handlers.onNotificationAdded, handlers.onAchievementUnlocked, handlers.onSessionReminderTriggered]);
}
