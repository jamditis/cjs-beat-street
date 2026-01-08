import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, X, Bell, Megaphone, Users } from 'lucide-react';
import { useNotificationEvents } from '../hooks/useNotifications';
import { Notification, NotificationType } from '../types/notification';

interface Toast {
  id: string;
  type: NotificationType | 'achievement_special';
  title: string;
  message: string;
  icon?: string;
}

/**
 * Get icon component for toast type
 */
function getToastIcon(type: Toast['type']) {
  switch (type) {
    case 'achievement':
    case 'achievement_special':
      return Trophy;
    case 'session_reminder':
      return Calendar;
    case 'networking':
      return Users;
    case 'announcement':
      return Megaphone;
    default:
      return Bell;
  }
}

/**
 * Get color classes for toast type
 */
function getToastColors(type: Toast['type']): {
  bg: string;
  border: string;
  icon: string;
  iconBg: string;
} {
  switch (type) {
    case 'achievement':
    case 'achievement_special':
      return {
        bg: 'bg-gradient-to-r from-amber-50 to-amber-100',
        border: 'border-amber-300',
        icon: 'text-amber-600',
        iconBg: 'bg-amber-200',
      };
    case 'session_reminder':
      return {
        bg: 'bg-gradient-to-r from-teal-50 to-teal-100',
        border: 'border-teal-300',
        icon: 'text-teal-600',
        iconBg: 'bg-teal-200',
      };
    case 'networking':
      return {
        bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
        border: 'border-blue-300',
        icon: 'text-blue-600',
        iconBg: 'bg-blue-200',
      };
    case 'announcement':
      return {
        bg: 'bg-gradient-to-r from-purple-50 to-purple-100',
        border: 'border-purple-300',
        icon: 'text-purple-600',
        iconBg: 'bg-purple-200',
      };
    default:
      return {
        bg: 'bg-gradient-to-r from-paper to-cream',
        border: 'border-ink/20',
        icon: 'text-ink',
        iconBg: 'bg-ink/10',
      };
  }
}

/**
 * Single toast notification
 */
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const Icon = getToastIcon(toast.type);
  const colors = getToastColors(toast.type);
  const isAchievement = toast.type === 'achievement' || toast.type === 'achievement_special';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`relative w-full max-w-sm rounded-xl shadow-lg border overflow-hidden ${colors.bg} ${colors.border}`}
    >
      {/* Achievement sparkle effect */}
      {isAchievement && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
        </motion.div>
      )}

      <div className="relative flex items-start gap-3 p-4">
        {/* Icon */}
        <motion.div
          initial={isAchievement ? { scale: 0, rotate: -180 } : { scale: 0 }}
          animate={isAchievement ? { scale: 1, rotate: 0 } : { scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colors.iconBg}`}
        >
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="font-semibold text-ink text-sm"
          >
            {toast.title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-ink/70 mt-0.5 line-clamp-2"
          >
            {toast.message}
          </motion.p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-ink/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ink/20"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 text-ink/50" />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: 'linear' }}
        className="h-1 bg-ink/10 origin-left"
        onAnimationComplete={() => onDismiss(toast.id)}
      />
    </motion.div>
  );
}

/**
 * Toast notification container
 */
export function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Listen for notifications
  useNotificationEvents({
    onNotificationAdded: (notification: Notification) => {
      // Only show toasts for certain types
      if (
        notification.type === 'session_reminder' ||
        notification.type === 'announcement'
      ) {
        const toast: Toast = {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
        };
        setToasts((prev) => [...prev, toast]);
      }
    },
    onAchievementUnlocked: (data) => {
      const toast: Toast = {
        id: `achievement-${data.achievementId}-${Date.now()}`,
        type: 'achievement_special',
        title: 'Achievement Unlocked!',
        message: data.achievementName,
        icon: data.iconUrl,
      };
      setToasts((prev) => [...prev, toast]);
    },
  });

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
