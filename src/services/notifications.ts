/**
 * Notification service for Beat Street CJS2026
 * Handles browser notifications, local storage, and scheduled reminders
 */

import type {
  Notification as AppNotification,
  NotificationType,
  ScheduledReminder,
  NotificationPreferences,
  SessionReminderNotification,
  AchievementNotification,
} from '../types/notification';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notification';
import { Session } from '../types/schedule';
import { eventBus } from '../lib/EventBus';

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATIONS: 'beat-street-notifications',
  REMINDERS: 'beat-street-reminders',
  PREFERENCES: 'beat-street-notification-prefs',
} as const;

// Maximum notifications to store
const MAX_NOTIFICATIONS = 50;

// Active timeout IDs for scheduled reminders
const activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

/**
 * Generate a unique notification ID
 */
function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Request browser notification permission
 * @returns Permission status: 'granted', 'denied', or 'default'
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Notifications] Browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Check if notifications are supported and permitted
 */
export function canShowNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Send a browser notification
 */
export function sendLocalNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    requireInteraction?: boolean;
    silent?: boolean;
  }
): globalThis.Notification | null {
  if (!canShowNotifications()) {
    console.warn('[Notifications] Cannot show notifications - permission not granted');
    return null;
  }

  const notification = new Notification(title, {
    body,
    icon: options?.icon || '/icon-192.png',
    badge: '/icon-96.png',
    tag: options?.tag,
    data: options?.data,
    requireInteraction: options?.requireInteraction ?? false,
    silent: options?.silent ?? false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();

    // Emit event for handling notification click
    if (options?.data) {
      eventBus.emit('notification-clicked', options.data);
    }
  };

  return notification;
}

/**
 * Get user notification preferences from localStorage
 */
export function getNotificationPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (stored) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('[Notifications] Failed to load preferences:', error);
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

/**
 * Save user notification preferences to localStorage
 */
export function saveNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): void {
  try {
    const current = getNotificationPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    eventBus.emit('notification-preferences-changed', updated);
  } catch (error) {
    console.error('[Notifications] Failed to save preferences:', error);
  }
}

/**
 * Get all stored notifications from localStorage
 */
export function getStoredNotifications(): AppNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((n: AppNotification) => ({
        ...n,
        timestamp: new Date(n.timestamp),
        expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
      }));
    }
  } catch (error) {
    console.error('[Notifications] Failed to load notifications:', error);
  }
  return [];
}

/**
 * Save notifications to localStorage
 */
function saveNotifications(notifications: AppNotification[]): void {
  try {
    // Keep only the most recent notifications
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[Notifications] Failed to save notifications:', error);
  }
}

/**
 * Add a new notification
 */
export function addNotification(
  notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
): AppNotification {
  const newNotification: AppNotification = {
    ...notification,
    id: generateId(),
    timestamp: new Date(),
    read: false,
  };

  const notifications = getStoredNotifications();
  notifications.unshift(newNotification);
  saveNotifications(notifications);

  // Emit event for UI updates
  eventBus.emit('notification-added', newNotification);

  // Show browser notification if enabled
  const prefs = getNotificationPreferences();
  if (prefs.enabled && shouldShowBrowserNotification(notification.type, prefs)) {
    sendLocalNotification(notification.title, notification.message, {
      tag: notification.type,
      data: { notificationId: newNotification.id, ...notification.data },
    });
  }

  return newNotification;
}

/**
 * Check if browser notification should be shown based on preferences
 */
function shouldShowBrowserNotification(
  type: NotificationType,
  prefs: NotificationPreferences
): boolean {
  switch (type) {
    case 'session_reminder':
      return prefs.sessionReminders;
    case 'achievement':
      return prefs.achievements;
    case 'networking':
      return prefs.networking;
    case 'announcement':
      return prefs.announcements;
    default:
      return true;
  }
}

/**
 * Mark a notification as read
 */
export function markNotificationRead(notificationId: string): void {
  const notifications = getStoredNotifications();
  const index = notifications.findIndex((n) => n.id === notificationId);

  if (index !== -1) {
    notifications[index].read = true;
    saveNotifications(notifications);
    eventBus.emit('notification-read', { notificationId });
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsRead(): void {
  const notifications = getStoredNotifications();
  notifications.forEach((n) => {
    n.read = true;
  });
  saveNotifications(notifications);
  eventBus.emit('notifications-all-read', {});
}

/**
 * Remove a specific notification
 */
export function removeNotification(notificationId: string): void {
  const notifications = getStoredNotifications();
  const filtered = notifications.filter((n) => n.id !== notificationId);
  saveNotifications(filtered);
  eventBus.emit('notification-removed', { notificationId });
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  saveNotifications([]);
  eventBus.emit('notifications-cleared', {});
}

/**
 * Get unread notification count
 */
export function getUnreadCount(): number {
  const notifications = getStoredNotifications();
  return notifications.filter((n) => !n.read).length;
}

/**
 * Get stored reminders from localStorage
 */
export function getStoredReminders(): ScheduledReminder[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((r: ScheduledReminder) => ({
        ...r,
        startTime: new Date(r.startTime),
        scheduledFor: new Date(r.scheduledFor),
      }));
    }
  } catch (error) {
    console.error('[Notifications] Failed to load reminders:', error);
  }
  return [];
}

/**
 * Save reminders to localStorage
 */
function saveReminders(reminders: ScheduledReminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  } catch (error) {
    console.error('[Notifications] Failed to save reminders:', error);
  }
}

/**
 * Schedule a session reminder
 * @returns The created reminder or null if session has already started
 */
export function scheduleSessionReminder(
  session: Session,
  minutesBefore: number = 15
): ScheduledReminder | null {
  const now = new Date();
  const reminderTime = new Date(session.startTime.getTime() - minutesBefore * 60 * 1000);

  // Don't schedule if the reminder time has passed
  if (reminderTime <= now) {
    console.warn('[Notifications] Cannot schedule reminder - time has passed');
    return null;
  }

  const reminder: ScheduledReminder = {
    id: `reminder-${session.id}-${minutesBefore}`,
    sessionId: session.id,
    sessionTitle: session.title,
    startTime: session.startTime,
    room: session.room,
    minutesBefore,
    scheduledFor: reminderTime,
    notified: false,
  };

  // Remove any existing reminder for the same session
  cancelSessionReminder(session.id);

  // Save to storage
  const reminders = getStoredReminders();
  reminders.push(reminder);
  saveReminders(reminders);

  // Schedule the actual timeout
  scheduleReminderTimer(reminder);

  eventBus.emit('reminder-scheduled', reminder);

  return reminder;
}

/**
 * Schedule a timer for a reminder
 */
function scheduleReminderTimer(reminder: ScheduledReminder): void {
  const now = Date.now();
  const delay = reminder.scheduledFor.getTime() - now;

  if (delay <= 0) {
    // Reminder time already passed, trigger immediately if not notified
    if (!reminder.notified) {
      triggerSessionReminder(reminder);
    }
    return;
  }

  // Clear any existing timer for this reminder
  if (activeTimers.has(reminder.id)) {
    clearTimeout(activeTimers.get(reminder.id)!);
  }

  // Set new timer
  const timerId = setTimeout(() => {
    triggerSessionReminder(reminder);
    activeTimers.delete(reminder.id);
  }, delay);

  activeTimers.set(reminder.id, timerId);
}

/**
 * Trigger a session reminder notification
 */
function triggerSessionReminder(reminder: ScheduledReminder): void {
  // Mark as notified
  const reminders = getStoredReminders();
  const index = reminders.findIndex((r) => r.id === reminder.id);
  if (index !== -1) {
    reminders[index].notified = true;
    saveReminders(reminders);
  }

  // Create notification
  const notification: Omit<SessionReminderNotification, 'id' | 'timestamp' | 'read'> = {
    type: 'session_reminder',
    title: 'Session Starting Soon',
    message: `${reminder.sessionTitle} starts in ${reminder.minutesBefore} minutes${reminder.room ? ` in ${reminder.room}` : ''}`,
    priority: 'high',
    data: {
      sessionId: reminder.sessionId,
      sessionTitle: reminder.sessionTitle,
      startTime: reminder.startTime,
      room: reminder.room,
      minutesBefore: reminder.minutesBefore,
    },
  };

  addNotification(notification);

  // Emit event for toast display
  eventBus.emit('session-reminder-triggered', {
    reminder,
    notification,
  });
}

/**
 * Cancel a scheduled session reminder
 */
export function cancelSessionReminder(sessionId: string): void {
  const reminders = getStoredReminders();
  const toRemove = reminders.filter((r) => r.sessionId === sessionId);

  // Clear timers
  toRemove.forEach((r) => {
    if (activeTimers.has(r.id)) {
      clearTimeout(activeTimers.get(r.id)!);
      activeTimers.delete(r.id);
    }
  });

  // Remove from storage
  const filtered = reminders.filter((r) => r.sessionId !== sessionId);
  saveReminders(filtered);

  if (toRemove.length > 0) {
    eventBus.emit('reminder-cancelled', { sessionId });
  }
}

/**
 * Check if a reminder exists for a session
 */
export function hasReminderForSession(sessionId: string): boolean {
  const reminders = getStoredReminders();
  return reminders.some((r) => r.sessionId === sessionId && !r.notified);
}

/**
 * Get reminder for a specific session
 */
export function getReminderForSession(sessionId: string): ScheduledReminder | undefined {
  const reminders = getStoredReminders();
  return reminders.find((r) => r.sessionId === sessionId && !r.notified);
}

/**
 * Initialize all pending reminders on app load
 * Call this when the app starts to reschedule timers
 */
export function initializeReminders(): void {
  const reminders = getStoredReminders();
  const now = new Date();

  reminders.forEach((reminder) => {
    if (!reminder.notified && reminder.scheduledFor > now) {
      scheduleReminderTimer(reminder);
    }
  });

  // Clean up old notified reminders (older than 24 hours)
  const cleanupThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const activeReminders = reminders.filter(
    (r) => !r.notified || r.scheduledFor > cleanupThreshold
  );

  if (activeReminders.length !== reminders.length) {
    saveReminders(activeReminders);
  }
}

/**
 * Create an achievement notification
 */
export function notifyAchievement(
  achievementId: string,
  achievementName: string,
  description: string,
  iconUrl?: string
): AppNotification {
  const notification: Omit<AchievementNotification, 'id' | 'timestamp' | 'read'> = {
    type: 'achievement',
    title: 'Achievement Unlocked!',
    message: achievementName,
    priority: 'normal',
    data: {
      achievementId,
      achievementName,
      description,
      iconUrl,
    },
  };

  const created = addNotification(notification);

  // Emit specific event for achievement toast
  eventBus.emit('achievement-unlocked', {
    achievementId,
    achievementName,
    description,
    iconUrl,
    notificationId: created.id,
  });

  return created;
}

/**
 * Create an announcement notification
 */
export function notifyAnnouncement(
  title: string,
  message: string,
  options?: {
    category?: 'general' | 'schedule_change' | 'emergency';
    actionUrl?: string;
  }
): AppNotification {
  const notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'> = {
    type: 'announcement',
    title,
    message,
    priority: options?.category === 'emergency' ? 'high' : 'normal',
    actionUrl: options?.actionUrl,
    data: {
      category: options?.category || 'general',
    },
  };

  return addNotification(notification);
}

/**
 * Cleanup function to clear all timers
 * Call when app unmounts
 */
export function cleanupNotifications(): void {
  activeTimers.forEach((timerId) => {
    clearTimeout(timerId);
  });
  activeTimers.clear();
}
