import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, X } from 'lucide-react';
import { AchievementUnlockEvent } from '../types/achievement';
import { useAchievementEvents } from '../hooks/useAchievements';

interface AchievementToastProps {
  /** Duration to show each toast (ms) */
  duration?: number;
  /** Maximum toasts to show at once */
  maxToasts?: number;
  /** Position on screen */
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
  /** Enable sound effect */
  enableSound?: boolean;
}

interface ToastItem {
  id: string;
  event: AchievementUnlockEvent;
  createdAt: number;
}

/**
 * Get position classes based on prop
 */
function getPositionClasses(
  position: AchievementToastProps['position']
): string {
  switch (position) {
    case 'top-center':
      return 'top-4 left-1/2 -translate-x-1/2 items-center';
    case 'bottom-right':
      return 'bottom-4 right-4 items-end';
    case 'bottom-center':
      return 'bottom-4 left-1/2 -translate-x-1/2 items-center';
    case 'top-right':
    default:
      return 'top-4 right-4 items-end';
  }
}

/**
 * Single toast notification component
 */
function Toast({
  event,
  onDismiss,
}: {
  event: AchievementUnlockEvent;
  onDismiss: () => void;
}) {
  const { achievement, totalPoints } = event;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="relative w-80 max-w-[calc(100vw-2rem)] bg-paper rounded-xl shadow-2xl border border-amber-200 overflow-hidden"
    >
      {/* Celebration gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-amber-500/5" />

      {/* Animated shine effect */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
      />

      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {/* Trophy icon with animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
            className="flex-shrink-0"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
              <Trophy className="w-7 h-7 text-white" />
            </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-1.5 text-amber-600 mb-1"
            >
              <Star className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Achievement Unlocked!
              </span>
            </motion.div>

            {/* Achievement name */}
            <motion.h4
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-lg text-ink leading-tight"
            >
              {achievement.name}
            </motion.h4>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-sm text-ink/60 mt-0.5"
            >
              {achievement.description}
            </motion.p>

            {/* Points earned */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 mt-2"
            >
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                <Star className="w-3 h-3" />+{achievement.points} points
              </span>
              <span className="text-xs text-ink/40">
                Total: {totalPoints} pts
              </span>
            </motion.div>
          </div>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-ink/5 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4 text-ink/40" />
          </button>
        </div>
      </div>

      {/* Bottom accent bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 origin-left"
      />
    </motion.div>
  );
}

/**
 * Achievement toast notification manager
 *
 * Displays animated celebration toasts when achievements are unlocked.
 * Listens for 'achievement-unlocked' events via EventBus.
 */
export function AchievementToast({
  duration = 6000,
  maxToasts = 3,
  position = 'top-right',
  enableSound = false,
}: AchievementToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Play celebration sound (optional)
  const playSound = useCallback(() => {
    if (!enableSound) return;

    try {
      // Create a simple celebration sound using Web Audio API
      const audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();

      // Play a quick ascending arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        const noteStart = audioContext.currentTime + i * 0.08;
        gainNode.gain.setValueAtTime(0.1, noteStart);
        gainNode.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.3);

        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.3);
      });
    } catch {
      // Audio not supported or blocked
    }
  }, [enableSound]);

  // Handle new achievement unlock
  const handleUnlock = useCallback(
    (event: AchievementUnlockEvent) => {
      const id = `${event.achievement.id}-${Date.now()}`;
      const newToast: ToastItem = {
        id,
        event,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // Remove oldest if at max
        const updated = prev.length >= maxToasts ? prev.slice(1) : prev;
        return [...updated, newToast];
      });

      playSound();
    },
    [maxToasts, playSound]
  );

  // Subscribe to achievement events
  useAchievementEvents(handleUnlock);

  // Auto-dismiss toasts after duration
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) => {
      const remaining = duration - (Date.now() - toast.createdAt);
      if (remaining <= 0) return null;

      return setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, remaining);
    });

    return () => {
      timers.forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [toasts, duration]);

  // Dismiss a specific toast
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const positionClasses = getPositionClasses(position);

  return (
    <div
      className={`fixed z-[100] flex flex-col gap-3 pointer-events-none ${positionClasses}`}
      role="region"
      aria-label="Achievement notifications"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              event={toast.event}
              onDismiss={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default AchievementToast;
