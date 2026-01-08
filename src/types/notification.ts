/**
 * Notification type definitions for Beat Street CJS2026
 */

/**
 * Types of notifications supported by the system
 */
export type NotificationType =
  | 'session_reminder'
  | 'achievement'
  | 'networking'
  | 'announcement';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high';

/**
 * Core notification data structure
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  expiresAt?: Date;
}

/**
 * Session reminder notification with session-specific data
 */
export interface SessionReminderNotification extends Notification {
  type: 'session_reminder';
  data: {
    sessionId: string;
    sessionTitle: string;
    startTime: Date;
    room?: string;
    minutesBefore: number;
  };
}

/**
 * Achievement notification with achievement-specific data
 */
export interface AchievementNotification extends Notification {
  type: 'achievement';
  data: {
    achievementId: string;
    achievementName: string;
    description: string;
    iconUrl?: string;
  };
}

/**
 * Networking notification (e.g., someone wants to connect)
 */
export interface NetworkingNotification extends Notification {
  type: 'networking';
  data: {
    fromUid: string;
    fromName: string;
    action: 'wave' | 'connection_request' | 'message';
  };
}

/**
 * Conference announcement notification
 */
export interface AnnouncementNotification extends Notification {
  type: 'announcement';
  data: {
    announcementId?: string;
    category?: 'general' | 'schedule_change' | 'emergency';
  };
}

/**
 * Union type for all notification types
 */
export type TypedNotification =
  | SessionReminderNotification
  | AchievementNotification
  | NetworkingNotification
  | AnnouncementNotification;

/**
 * Scheduled reminder configuration
 */
export interface ScheduledReminder {
  id: string;
  sessionId: string;
  sessionTitle: string;
  startTime: Date;
  room?: string;
  minutesBefore: number;
  scheduledFor: Date;
  notified: boolean;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  enabled: boolean;
  sessionReminders: boolean;
  achievements: boolean;
  networking: boolean;
  announcements: boolean;
  defaultReminderMinutes: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sessionReminders: true,
  achievements: true,
  networking: true,
  announcements: true,
  defaultReminderMinutes: 15,
  soundEnabled: true,
  vibrationEnabled: true,
};

/**
 * Notification filter options
 */
export interface NotificationFilter {
  type?: NotificationType | NotificationType[];
  read?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Notification event payloads for EventBus
 */
export interface NotificationEventData {
  notification: Notification;
  action: 'created' | 'read' | 'dismissed' | 'clicked';
}
