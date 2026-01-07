// Badge showcase component for displaying earned and locked badges

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Compass,
  BookOpen,
  Users,
  Flag,
  Trophy,
  Lock,
  Award,
} from 'lucide-react';
import { Badge, BadgeProgress } from '../types/achievements';

interface BadgeWithProgress extends BadgeProgress {
  badge: Badge;
  isUnlocked: boolean;
  progressPercentage: number;
}

interface BadgeDisplayProps {
  badges: BadgeWithProgress[];
  totalBadges: number;
  isOpen: boolean;
  onClose: () => void;
}

const badgeIcons: Record<string, React.ElementType> = {
  compass: Compass,
  book: BookOpen,
  people: Users,
  flag: Flag,
  trophy: Trophy,
};

const rarityColors = {
  common: 'bg-ink/10 text-ink',
  rare: 'bg-blue-100 text-blue-600',
  epic: 'bg-purple-100 text-purple-600',
  legendary: 'bg-amber-100 text-amber-600',
};

export function BadgeDisplay({
  badges,
  totalBadges,
  isOpen,
  onClose,
}: BadgeDisplayProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key to close
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedBadge) {
          setSelectedBadge(null);
        } else {
          onClose();
        }
        return;
      }

      // Focus trap: Tab cycles within modal
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [selectedBadge, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  const getBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const IconComponent = badgeIcons[iconName] || Award;
    const className = isUnlocked
      ? 'w-8 h-8 text-teal-600'
      : 'w-8 h-8 text-ink/30';
    return <IconComponent className={className} />;
  };

  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const inProgressBadges = badges.filter(
    (b) => !b.isUnlocked && b.currentValue > 0
  );
  const lockedBadges = badges.filter(
    (b) => !b.isUnlocked && b.currentValue === 0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-display-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !selectedBadge) {
              onClose();
            }
          }}
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-paper rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-teal-600" />
                <div>
                  <h2
                    id="badge-display-title"
                    className="font-display text-2xl text-ink"
                  >
                    My Badges
                  </h2>
                  <p className="text-sm text-ink/60">
                    {totalBadges} of {badges.length} unlocked
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close badge display"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            {/* Unlocked Badges */}
            {unlockedBadges.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-teal-600" />
                  Unlocked ({unlockedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {unlockedBadges.map((badge) => (
                    <BadgeCard
                      key={badge.badgeId}
                      badge={badge}
                      onClick={() => setSelectedBadge(badge)}
                      getBadgeIcon={getBadgeIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* In Progress Badges */}
            {inProgressBadges.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-ink/60" />
                  In Progress ({inProgressBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {inProgressBadges.map((badge) => (
                    <BadgeCard
                      key={badge.badgeId}
                      badge={badge}
                      onClick={() => setSelectedBadge(badge)}
                      getBadgeIcon={getBadgeIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Locked Badges */}
            {lockedBadges.length > 0 && (
              <div>
                <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-ink/40" />
                  Locked ({lockedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {lockedBadges.map((badge) => (
                    <BadgeCard
                      key={badge.badgeId}
                      badge={badge}
                      onClick={() => setSelectedBadge(badge)}
                      getBadgeIcon={getBadgeIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Badge Details Modal */}
            <AnimatePresence>
              {selectedBadge && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={() => setSelectedBadge(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-paper rounded-xl max-w-md w-full p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col items-center text-center">
                      {/* Badge Icon */}
                      <div
                        className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
                          selectedBadge.isUnlocked
                            ? 'bg-teal-100'
                            : 'bg-ink/5'
                        }`}
                      >
                        {getBadgeIcon(
                          selectedBadge.badge.icon,
                          selectedBadge.isUnlocked
                        )}
                      </div>

                      {/* Badge Name and Rarity */}
                      <h3 className="font-display text-2xl text-ink mb-2">
                        {selectedBadge.badge.name}
                      </h3>
                      {selectedBadge.badge.rarity && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                            rarityColors[selectedBadge.badge.rarity]
                          }`}
                        >
                          {selectedBadge.badge.rarity.toUpperCase()}
                        </span>
                      )}

                      {/* Description */}
                      <p className="text-ink/70 mb-4">
                        {selectedBadge.badge.description}
                      </p>

                      {/* Progress */}
                      {selectedBadge.isUnlocked ? (
                        <div className="w-full bg-teal-100 rounded-lg p-3">
                          <p className="text-teal-700 font-semibold">
                            Unlocked!
                          </p>
                          {selectedBadge.unlockedAt && (
                            <p className="text-teal-600 text-sm mt-1">
                              {new Date(
                                selectedBadge.unlockedAt as Date
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-ink/60">Progress</span>
                            <span className="text-ink font-semibold">
                              {selectedBadge.currentValue} /{' '}
                              {selectedBadge.targetValue}
                            </span>
                          </div>
                          <div className="w-full bg-ink/10 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${selectedBadge.progressPercentage}%`,
                              }}
                              className="h-full bg-teal-600 rounded-full"
                            />
                          </div>
                          <p className="text-xs text-ink/60 mt-2">
                            {selectedBadge.badge.requirement.description}
                          </p>
                        </div>
                      )}

                      {/* Close Button */}
                      <button
                        onClick={() => setSelectedBadge(null)}
                        className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface BadgeCardProps {
  badge: BadgeWithProgress;
  onClick: () => void;
  getBadgeIcon: (iconName: string, isUnlocked: boolean) => React.ReactElement;
}

function BadgeCard({ badge, onClick, getBadgeIcon }: BadgeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
        badge.isUnlocked
          ? 'border-teal-600 bg-teal-50 hover:bg-teal-100'
          : 'border-ink/10 bg-cream hover:bg-parchment'
      }`}
    >
      {/* Badge Icon */}
      <div
        className={`w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center ${
          badge.isUnlocked ? 'bg-white' : 'bg-white/50'
        }`}
      >
        {getBadgeIcon(badge.badge.icon, badge.isUnlocked)}
      </div>

      {/* Badge Name */}
      <h4
        className={`font-semibold text-sm ${
          badge.isUnlocked ? 'text-ink' : 'text-ink/50'
        }`}
      >
        {badge.badge.name}
      </h4>

      {/* Progress Bar (for in-progress badges) */}
      {!badge.isUnlocked && badge.currentValue > 0 && (
        <div className="mt-2">
          <div className="w-full bg-ink/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full"
              style={{ width: `${badge.progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-ink/60 mt-1">
            {badge.currentValue}/{badge.targetValue}
          </p>
        </div>
      )}

      {/* Lock Icon (for locked badges) */}
      {!badge.isUnlocked && badge.currentValue === 0 && (
        <div className="mt-2">
          <Lock className="w-3 h-3 text-ink/30 mx-auto" />
        </div>
      )}
    </button>
  );
}
