/**
 * Scavenger Hunt Panel Component
 * Displays hunt items, progress, leaderboard, and check-in functionality
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trophy,
  Target,
  MapPin,
  Calendar,
  Building2,
  Star,
  CheckCircle2,
  Circle,
  Filter,
  TrendingUp,
  Award,
  Sparkles,
} from 'lucide-react';
import { useScavengerHunt, useHuntEvent } from '../hooks/useScavengerHunt';
import { VenueId } from '../types/venue';
import { HuntItemType, CheckInMethod } from '../types/gamification';

interface ScavengerHuntPanelProps {
  userId: string;
  venueId: VenueId;
  displayName?: string;
  playerPosition?: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | HuntItemType;
type ViewMode = 'items' | 'leaderboard';

export function ScavengerHuntPanel({
  userId,
  venueId,
  displayName,
  playerPosition,
  isOpen,
  onClose,
}: ScavengerHuntPanelProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('items');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const {
    huntItems,
    leaderboard,
    nearbyItems,
    stats,
    isLoading,
    error,
    checkIn,
    isItemCompleted,
    filterItemsByType,
  } = useScavengerHunt({
    userId,
    venueId,
    displayName,
    playerPosition,
    autoCheckInEnabled: false, // Manual check-in only via panel
  });

  // Listen for hunt item collection events to show celebration
  useHuntEvent('hunt-item-collected', useCallback((data: unknown) => {
    const event = data as { itemId: string; progress: { completedAt?: unknown } };

    // Show celebration if hunt is completed
    if (event.progress.completedAt) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, []));

  // Handle check-in
  const handleCheckIn = useCallback(
    async (itemId: string) => {
      setCheckingIn(itemId);
      try {
        await checkIn(itemId, CheckInMethod.TAP);
      } catch (err) {
        console.error('Check-in failed:', err);
      } finally {
        setCheckingIn(null);
      }
    },
    [checkIn]
  );

  // Filter items based on selected type
  const filteredItems = useMemo(() => {
    if (filterType === 'all') {
      return huntItems;
    }
    return filterItemsByType(filterType);
  }, [huntItems, filterType, filterItemsByType]);

  // Get type icon
  const getTypeIcon = (type: HuntItemType) => {
    switch (type) {
      case HuntItemType.SPONSOR:
        return <Building2 className="w-4 h-4" />;
      case HuntItemType.SESSION:
        return <Calendar className="w-4 h-4" />;
      case HuntItemType.LANDMARK:
        return <Star className="w-4 h-4" />;
    }
  };

  // Get type color
  const getTypeColor = (type: HuntItemType) => {
    switch (type) {
      case HuntItemType.SPONSOR:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case HuntItemType.SESSION:
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case HuntItemType.LANDMARK:
        return 'bg-amber-100 text-amber-700 border-amber-300';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[var(--paper)] rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Celebration overlay */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
              >
                <div className="text-center text-white">
                  <Sparkles className="w-24 h-24 mx-auto mb-4 text-yellow-400" />
                  <h2 className="text-4xl font-bold mb-2">Hunt Complete!</h2>
                  <p className="text-xl">
                    You've collected all items! +50 bonus points!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="bg-[var(--teal-600)] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Scavenger Hunt</h2>
                {stats && (
                  <p className="text-sm text-white/90">
                    {stats.completedItems} of {stats.totalItems} items collected
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close scavenger hunt panel"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress bar */}
          {stats && (
            <div className="bg-white p-4 border-b border-[var(--parchment)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--ink)]">
                  Progress
                </span>
                <span className="text-sm font-bold text-[var(--teal-600)]">
                  {stats.totalPoints} points
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.completionPercentage}%` }}
                  className="h-full bg-gradient-to-r from-[var(--teal-600)] to-green-500"
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                <span>{Math.round(stats.completionPercentage)}% complete</span>
                {stats.isCompleted && (
                  <span className="text-green-600 font-bold flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    Completed!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* View mode tabs */}
          <div className="flex border-b border-[var(--parchment)] bg-white">
            <button
              onClick={() => setViewMode('items')}
              className={`flex-1 px-4 py-3 font-medium transition-colors ${
                viewMode === 'items'
                  ? 'text-[var(--teal-600)] border-b-2 border-[var(--teal-600)]'
                  : 'text-gray-600 hover:text-[var(--ink)]'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Hunt Items
            </button>
            <button
              onClick={() => setViewMode('leaderboard')}
              className={`flex-1 px-4 py-3 font-medium transition-colors ${
                viewMode === 'leaderboard'
                  ? 'text-[var(--teal-600)] border-b-2 border-[var(--teal-600)]'
                  : 'text-gray-600 hover:text-[var(--ink)]'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Leaderboard
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(80vh-250px)] bg-[var(--cream)]">
            {isLoading ? (
              <div className="p-8 text-center text-gray-600">
                Loading scavenger hunt...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                Error loading hunt: {error.message}
              </div>
            ) : viewMode === 'items' ? (
              <>
                {/* Filter buttons */}
                <div className="p-4 flex gap-2 overflow-x-auto bg-white border-b border-[var(--parchment)]">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      filterType === 'all'
                        ? 'bg-[var(--teal-600)] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Filter className="w-3 h-3 inline mr-1" />
                    All ({huntItems.length})
                  </button>
                  <button
                    onClick={() => setFilterType(HuntItemType.SPONSOR)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      filterType === HuntItemType.SPONSOR
                        ? 'bg-[var(--teal-600)] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Building2 className="w-3 h-3 inline mr-1" />
                    Sponsors ({stats?.byType[HuntItemType.SPONSOR]?.total || 0})
                  </button>
                  <button
                    onClick={() => setFilterType(HuntItemType.SESSION)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      filterType === HuntItemType.SESSION
                        ? 'bg-[var(--teal-600)] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Sessions ({stats?.byType[HuntItemType.SESSION]?.total || 0})
                  </button>
                  <button
                    onClick={() => setFilterType(HuntItemType.LANDMARK)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      filterType === HuntItemType.LANDMARK
                        ? 'bg-[var(--teal-600)] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Star className="w-3 h-3 inline mr-1" />
                    Landmarks ({stats?.byType[HuntItemType.LANDMARK]?.total || 0})
                  </button>
                </div>

                {/* Hunt items list */}
                <div className="p-4 space-y-3">
                  {filteredItems.map((item) => {
                    const completed = isItemCompleted(item.id);
                    const isNearby = nearbyItems.some((n) => n.id === item.id);
                    const isCheckingInThis = checkingIn === item.id;

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-white rounded-lg p-4 border-2 transition-all ${
                          completed
                            ? 'border-green-300 bg-green-50'
                            : isNearby
                            ? 'border-[var(--teal-600)] shadow-md'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              completed
                                ? 'bg-green-500 text-white'
                                : getTypeColor(item.type)
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              getTypeIcon(item.type)
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h3
                                  className={`font-semibold ${
                                    completed
                                      ? 'text-green-700 line-through'
                                      : 'text-[var(--ink)]'
                                  }`}
                                >
                                  {item.name}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {item.description}
                                </p>
                                {item.metadata?.hint && !completed && (
                                  <p className="text-xs text-gray-500 italic mt-1">
                                    Hint: {item.metadata.hint}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={`text-sm font-bold ${
                                    completed
                                      ? 'text-green-600'
                                      : 'text-[var(--teal-600)]'
                                  }`}
                                >
                                  {item.points} pts
                                </span>
                                {isNearby && !completed && (
                                  <span className="text-xs bg-[var(--teal-600)] text-white px-2 py-1 rounded-full flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    Nearby
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Check-in button */}
                            {!completed && (
                              <button
                                onClick={() => handleCheckIn(item.id)}
                                disabled={isCheckingInThis}
                                className="mt-3 w-full py-2 px-4 bg-[var(--teal-600)] text-white rounded-lg font-medium hover:bg-[var(--teal-600)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isCheckingInThis ? (
                                  'Checking in...'
                                ) : (
                                  <>
                                    <Circle className="w-4 h-4 inline mr-2" />
                                    Check In
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No items found for this filter
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Leaderboard view
              <div className="p-4 space-y-2">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => {
                    const isCurrentUser = entry.userId === userId;
                    const medal =
                      index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                    return (
                      <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-white rounded-lg p-4 border-2 ${
                          isCurrentUser
                            ? 'border-[var(--teal-600)] bg-[var(--teal-600)]/5'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`text-2xl font-bold w-10 text-center ${
                              medal ? '' : 'text-gray-400'
                            }`}
                          >
                            {medal || `#${entry.rank}`}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[var(--ink)] truncate">
                              {entry.displayName}
                              {isCurrentUser && (
                                <span className="text-xs text-[var(--teal-600)] ml-2">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {entry.itemsCollected} items collected
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-[var(--teal-600)]">
                              {entry.totalPoints}
                            </div>
                            <div className="text-xs text-gray-500">points</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No entries yet. Be the first to start collecting!
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
