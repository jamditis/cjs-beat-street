import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, RefreshCw, Eye, EyeOff, Shield, Info, TrendingUp } from 'lucide-react';
import { LeaderboardEntry } from './LeaderboardEntry';
import { useLeaderboard } from '../hooks/useLeaderboard';

interface LeaderboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
  photoURL?: string;
}

/**
 * Main leaderboard panel with full features
 * - Top 10 list with rank, avatar, name, points
 * - Highlight current user's entry
 * - Opt-in/opt-out toggle with privacy explanation
 * - Refresh button
 * - Tabbed view: Today / All Time (currently shows All Time only)
 */
export function LeaderboardPanel({
  isOpen,
  onClose,
  userId,
  displayName,
  photoURL,
}: LeaderboardPanelProps) {
  const [showOptInInfo, setShowOptInInfo] = useState(false);

  const {
    leaderboard,
    userRank,
    isOptedIn,
    toggleOptIn,
    refresh,
    loading,
    userRankLoading,
    optInLoading,
    error,
  } = useLeaderboard({
    userId,
    displayName,
    photoURL,
    queryOptions: { limit: 10 },
    fetchUserRank: true,
    realtime: true,
  });

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleToggleOptIn = useCallback(async () => {
    await toggleOptIn();
  }, [toggleOptIn]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Check if current user is in top 10
  const userInTop10 = leaderboard.some((entry) => entry.uid === userId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 max-w-[calc(100vw-2rem)] bg-paper shadow-xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-panel-title"
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-cream">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-teal-600" />
                  <h2 id="leaderboard-panel-title" className="font-display text-2xl text-ink">
                    Leaderboard
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
                  aria-label="Close leaderboard"
                >
                  <X className="w-5 h-5 text-ink" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading || userRankLoading}
                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading || userRankLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Privacy Notice & Opt-In Toggle */}
              <div className="bg-cream/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-teal-600" />
                    <span className="font-semibold text-ink">Privacy</span>
                  </div>
                  <button
                    onClick={() => setShowOptInInfo(!showOptInInfo)}
                    className="text-teal-600 hover:text-teal-700 transition-colors"
                    aria-label="Toggle privacy info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                <AnimatePresence>
                  {showOptInInfo && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-xs text-ink/70 leading-relaxed"
                    >
                      Your leaderboard visibility is completely optional. Only your display name
                      and points will be shown. You can opt out at any time.
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleToggleOptIn}
                  disabled={optInLoading}
                  className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    isOptedIn
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-cream text-ink border-2 border-teal-600 hover:bg-teal-600/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {optInLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      Updating...
                    </>
                  ) : isOptedIn ? (
                    <>
                      <Eye className="w-4 h-4" />
                      Visible on Leaderboard
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Join Leaderboard
                    </>
                  )}
                </button>
              </div>

              {/* User's Rank (if opted in and not in top 10) */}
              {isOptedIn && userRank && !userInTop10 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink/70">
                    <TrendingUp className="w-4 h-4" />
                    Your Rank
                  </div>
                  <div className="bg-teal-600/10 border-2 border-teal-600 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-teal-600">#{userRank.rank}</span>
                      <span className="text-lg font-semibold text-ink">
                        {userRank.points.toLocaleString()} pts
                      </span>
                    </div>
                    {userRank.pointsToNextRank !== null && (
                      <p className="text-xs text-ink/70">
                        {userRank.pointsToNextRank.toLocaleString()} points to rank {userRank.rank - 1}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Not Opted In Message */}
              {!isOptedIn && (
                <div className="bg-cream/50 rounded-xl p-6 text-center space-y-2">
                  <div className="w-12 h-12 bg-teal-600/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trophy className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-ink">Join the Competition</h3>
                  <p className="text-sm text-ink/70">
                    Opt in to see your rank and compete with other attendees!
                  </p>
                </div>
              )}

              {/* Top 10 List */}
              <div className="space-y-2">
                <h3 className="font-semibold text-ink flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-teal-600" />
                  Top 10
                </h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    Failed to load leaderboard. Please try again.
                  </div>
                )}

                {loading ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-20 bg-cream/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-ink/60">
                    <Trophy className="w-12 h-12 mx-auto mb-2 text-ink/20" />
                    <p className="text-sm">No one on the leaderboard yet.</p>
                    <p className="text-xs mt-1">Be the first to join!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry) => (
                      <LeaderboardEntry
                        key={entry.uid}
                        entry={entry}
                        isCurrentUser={userId === entry.uid}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
