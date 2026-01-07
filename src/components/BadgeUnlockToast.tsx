// Toast notification for badge unlocks

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  BookOpen,
  Users,
  Flag,
  Trophy,
  Award,
  Sparkles,
} from 'lucide-react';
import { BadgeUnlockEvent } from '../types/achievements';

interface BadgeUnlockToastProps {
  unlockEvent: BadgeUnlockEvent | null;
  onDismiss?: () => void;
}

const badgeIcons: Record<string, React.ElementType> = {
  compass: Compass,
  book: BookOpen,
  people: Users,
  flag: Flag,
  trophy: Trophy,
};

const rarityColors = {
  common: 'from-teal-500 to-teal-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-amber-500 to-amber-600',
};

export function BadgeUnlockToast({
  unlockEvent,
  onDismiss,
}: BadgeUnlockToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (unlockEvent) {
      setIsVisible(true);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          setTimeout(onDismiss, 300); // Wait for exit animation
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [unlockEvent, onDismiss]);

  if (!unlockEvent) return null;

  const { badge } = unlockEvent;
  const IconComponent = badgeIcons[badge.icon] || Award;
  const gradientClass =
    rarityColors[badge.rarity || 'common'] || rarityColors.common;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <button
            onClick={() => {
              setIsVisible(false);
              if (onDismiss) {
                setTimeout(onDismiss, 300);
              }
            }}
            className="focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600 rounded-xl"
          >
            <div
              className={`relative bg-gradient-to-r ${gradientClass} text-white rounded-xl shadow-2xl overflow-hidden`}
            >
              {/* Sparkle Animation Background */}
              <div className="absolute inset-0 opacity-20">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  }}
                  className="absolute top-0 left-0 w-full h-full"
                >
                  <Sparkles className="w-8 h-8 absolute top-2 left-2" />
                  <Sparkles className="w-6 h-6 absolute top-4 right-4" />
                  <Sparkles className="w-4 h-4 absolute bottom-2 left-1/2" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="relative flex items-center gap-4 p-4 pr-6 min-w-[320px]">
                {/* Badge Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    damping: 15,
                    stiffness: 200,
                    delay: 0.1,
                  }}
                  className="flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30"
                >
                  <IconComponent className="w-8 h-8 text-white" />
                </motion.div>

                {/* Text */}
                <div className="flex-1">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="font-display text-lg font-bold text-white mb-1 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Achievement Unlocked!
                    </p>
                    <p className="font-semibold text-white/90">{badge.name}</p>
                    <p className="text-sm text-white/70 mt-0.5">
                      {badge.description}
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Progress Bar */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 5, ease: 'linear' }}
                className="h-1 bg-white/30 origin-left"
              />
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
