import { Trophy, ArrowRight } from 'lucide-react';
import { LeaderboardEntry } from './LeaderboardEntry';
import { useLeaderboard } from '../hooks/useLeaderboard';

interface MiniLeaderboardProps {
  userId?: string;
  onViewFull?: () => void;
}

/**
 * Compact leaderboard widget showing top 3 users
 * Perfect for sidebars or dashboard widgets
 */
export function MiniLeaderboard({ userId, onViewFull }: MiniLeaderboardProps) {
  const { leaderboard, loading, error } = useLeaderboard({
    userId,
    queryOptions: { limit: 3 },
    fetchUserRank: false,
  });

  if (loading) {
    return (
      <div className="bg-paper rounded-xl p-4 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-teal-600" />
          <h3 className="font-display text-lg text-ink">Top Players</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-cream/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-paper rounded-xl p-4 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-teal-600" />
          <h3 className="font-display text-lg text-ink">Top Players</h3>
        </div>
        <p className="text-sm text-ink/60">Failed to load leaderboard</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-paper rounded-xl p-4 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-teal-600" />
          <h3 className="font-display text-lg text-ink">Top Players</h3>
        </div>
        <p className="text-sm text-ink/60 text-center py-4">
          Be the first to join the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-xl p-4 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-teal-600" />
          <h3 className="font-display text-lg text-ink">Top Players</h3>
        </div>
      </div>

      {/* Top 3 Entries */}
      <div className="space-y-2 mb-3">
        {leaderboard.map((entry) => (
          <LeaderboardEntry
            key={entry.uid}
            entry={entry}
            isCurrentUser={userId === entry.uid}
            compact
          />
        ))}
      </div>

      {/* View Full Leaderboard Link */}
      {onViewFull && (
        <button
          onClick={onViewFull}
          className="w-full py-2 text-sm text-teal-600 hover:text-teal-700 font-semibold flex items-center justify-center gap-1 transition-colors"
        >
          View Full Leaderboard
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
