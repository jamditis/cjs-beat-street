import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trophy,
  Star,
  Lock,
  CheckCircle2,
  ChevronDown,
  Medal,
  Target,
  Users,
  MapPin,
  Calendar,
  Crown,
} from 'lucide-react';
import { Achievement, AchievementCategory, LeaderboardEntry } from '../types/achievement';
import { useAchievements } from '../hooks/useAchievements';

interface AchievementPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Current user ID */
  uid: string | null;
  /** Current user display name */
  displayName?: string;
}

type TabFilter = 'achievements' | 'leaderboard';
type CategoryFilter = 'all' | AchievementCategory;

/**
 * Get icon for achievement category
 */
function getCategoryIcon(category: AchievementCategory): React.ReactNode {
  switch (category) {
    case 'exploration':
      return <MapPin className="w-4 h-4" />;
    case 'networking':
      return <Users className="w-4 h-4" />;
    case 'sessions':
      return <Calendar className="w-4 h-4" />;
    case 'sponsors':
      return <Star className="w-4 h-4" />;
    default:
      return <Trophy className="w-4 h-4" />;
  }
}

/**
 * Get category display info
 */
function getCategoryInfo(category: AchievementCategory): {
  label: string;
  color: string;
} {
  switch (category) {
    case 'exploration':
      return { label: 'Exploration', color: 'bg-emerald-500/10 text-emerald-700' };
    case 'networking':
      return { label: 'Networking', color: 'bg-blue-500/10 text-blue-700' };
    case 'sessions':
      return { label: 'Sessions', color: 'bg-purple-500/10 text-purple-700' };
    case 'sponsors':
      return { label: 'Sponsors', color: 'bg-amber-500/10 text-amber-700' };
    default:
      return { label: 'Other', color: 'bg-ink/10 text-ink/70' };
  }
}

/**
 * Progress bar component
 */
function ProgressBar({
  current,
  target,
  percentage,
}: {
  current: number;
  target: number;
  percentage: number;
}) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-ink/50 mb-1">
        <span>Progress</span>
        <span>
          {current}/{target}
        </span>
      </div>
      <div className="h-2 bg-cream rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"
        />
      </div>
    </div>
  );
}

/**
 * Single achievement card component
 */
function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
  progress,
  expanded,
  onToggle,
}: {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: { current: number; target: number; percentage: number } | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const categoryInfo = getCategoryInfo(achievement.category);
  const isSecret = achievement.secret && !unlocked;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`bg-paper rounded-lg border transition-all ${
        unlocked
          ? 'border-amber-400/50 shadow-md shadow-amber-500/10'
          : 'border-ink/10 hover:border-ink/20'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 rounded-lg"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
              unlocked
                ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-cream text-ink/30'
            }`}
          >
            {unlocked ? (
              <Trophy className="w-6 h-6" />
            ) : isSecret ? (
              <Lock className="w-5 h-5" />
            ) : (
              <Target className="w-5 h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4
                className={`font-semibold leading-tight ${
                  unlocked ? 'text-ink' : isSecret ? 'text-ink/40' : 'text-ink/70'
                }`}
              >
                {isSecret ? 'Secret Achievement' : achievement.name}
              </h4>
              {unlocked && (
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
            </div>

            <p
              className={`text-sm mt-0.5 ${
                unlocked ? 'text-ink/70' : isSecret ? 'text-ink/30' : 'text-ink/50'
              }`}
            >
              {isSecret ? 'Complete secret tasks to unlock' : achievement.description}
            </p>

            {/* Points badge */}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  unlocked
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-ink/5 text-ink/40'
                }`}
              >
                <Star className="w-3 h-3" />
                {achievement.points} pts
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryInfo.color}`}
              >
                {getCategoryIcon(achievement.category)}
                {categoryInfo.label}
              </span>
            </div>

            {/* Progress bar for incomplete achievements */}
            {!unlocked && progress && progress.target > 1 && (
              <ProgressBar
                current={progress.current}
                target={progress.target}
                percentage={progress.percentage}
              />
            )}
          </div>

          {/* Expand icon */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="text-ink/40 flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && !isSecret && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-ink/5 pt-3 ml-15">
              {/* Hint */}
              {!unlocked && achievement.hint && (
                <p className="text-sm text-teal-600 bg-teal-50 px-3 py-2 rounded-lg">
                  Hint: {achievement.hint}
                </p>
              )}

              {/* Unlocked date */}
              {unlocked && unlockedAt && (
                <p className="text-xs text-ink/50">
                  Unlocked on{' '}
                  {unlockedAt.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Leaderboard entry component
 */
function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const getRankIcon = () => {
    switch (entry.rank) {
      case 1:
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-ink/50">
            {entry.rank}
          </span>
        );
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isCurrentUser ? 'bg-teal-50 border border-teal-200' : 'bg-paper'
      }`}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8">{getRankIcon()}</div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${
            isCurrentUser ? 'text-teal-700' : 'text-ink'
          }`}
        >
          {entry.displayName}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-teal-600">(You)</span>
          )}
        </p>
        <p className="text-xs text-ink/50">
          {entry.achievementCount} achievement
          {entry.achievementCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Points */}
      <div className="flex-shrink-0 text-right">
        <p
          className={`font-semibold ${
            isCurrentUser ? 'text-teal-700' : 'text-ink'
          }`}
        >
          {entry.totalPoints}
        </p>
        <p className="text-xs text-ink/50">points</p>
      </div>
    </div>
  );
}

/**
 * Achievement panel showing all achievements and leaderboard
 */
export function AchievementPanel({
  isOpen,
  onClose,
  uid,
  displayName,
}: AchievementPanelProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('achievements');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const {
    allAchievements,
    totalPoints,
    unlockedCount,
    totalCount,
    leaderboard,
    userRank,
    getAchievementProgress,
    isLoading,
    refreshLeaderboard,
  } = useAchievements({ uid, displayName });

  // Filter achievements by category
  const filteredAchievements =
    categoryFilter === 'all'
      ? allAchievements
      : allAchievements.filter((a) => a.category === categoryFilter);

  // Sort: unlocked first, then by points
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) {
      return a.unlocked ? -1 : 1;
    }
    return b.points - a.points;
  });

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

  // Refresh leaderboard when tab changes
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      refreshLeaderboard();
    }
  }, [activeTab, refreshLeaderboard]);

  const categories: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'exploration', label: 'Exploration' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'sponsors', label: 'Sponsors' },
    { id: 'networking', label: 'Networking' },
  ];

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
          aria-labelledby="achievement-panel-title"
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-ink/10 bg-paper">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    Achievements
                  </span>
                </div>
                <h2
                  id="achievement-panel-title"
                  className="font-display text-xl text-ink"
                >
                  Your Progress
                </h2>
                {!isLoading && (
                  <p className="text-xs text-ink/50 mt-1">
                    {unlockedCount} of {totalCount} unlocked | {totalPoints} points
                    {userRank && ` | Rank #${userRank}`}
                  </p>
                )}
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close achievements panel"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            {/* Tab filters */}
            <div className="flex gap-1 mt-4 bg-cream rounded-lg p-1">
              {[
                { id: 'achievements' as const, label: 'Achievements' },
                { id: 'leaderboard' as const, label: 'Leaderboard' },
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
                </button>
              ))}
            </div>

            {/* Category filter (achievements tab only) */}
            {activeTab === 'achievements' && (
              <div className="flex gap-1 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                      categoryFilter === cat.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-paper text-ink/60 hover:text-ink hover:bg-parchment'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-ink/50">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p>Loading...</p>
              </div>
            ) : activeTab === 'achievements' ? (
              sortedAchievements.length === 0 ? (
                <div className="text-center py-12 text-ink/50">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No achievements yet</p>
                  <p className="text-sm mt-1">Start exploring to earn badges!</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {sortedAchievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      unlocked={achievement.unlocked}
                      unlockedAt={achievement.unlockedAt}
                      progress={getAchievementProgress(achievement.id)}
                      expanded={expandedId === achievement.id}
                      onToggle={() =>
                        setExpandedId(
                          expandedId === achievement.id ? null : achievement.id
                        )
                      }
                    />
                  ))}
                </AnimatePresence>
              )
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-ink/50">
                <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No rankings yet</p>
                <p className="text-sm mt-1">Be the first to earn points!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <LeaderboardRow
                    key={entry.uid}
                    entry={entry}
                    isCurrentUser={entry.uid === uid}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer with point summary */}
          {activeTab === 'achievements' && totalPoints > 0 && (
            <div className="flex-shrink-0 p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border-t border-amber-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Total Points
                    </p>
                    <p className="text-xs text-amber-600">
                      {unlockedCount} badges earned
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-700">{totalPoints}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AchievementPanel;
