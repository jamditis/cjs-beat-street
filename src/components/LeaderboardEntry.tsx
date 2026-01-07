import { Trophy, Award, Star } from 'lucide-react';
import { LeaderboardEntry as LeaderboardEntryType } from '../types/leaderboard';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
  isCurrentUser?: boolean;
  compact?: boolean;
}

/**
 * Individual leaderboard entry component
 * Displays rank, user info, points, and badges
 */
export function LeaderboardEntry({
  entry,
  isCurrentUser = false,
  compact = false,
}: LeaderboardEntryProps) {
  const { rank, displayName, points, badgeCount, photoURL } = entry;

  // Determine rank styling and icon
  const getRankStyle = () => {
    if (rank === 1) {
      return {
        bgColor: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
        textColor: 'text-yellow-900',
        icon: <Trophy className="w-4 h-4" />,
      };
    }
    if (rank === 2) {
      return {
        bgColor: 'bg-gradient-to-br from-gray-300 to-gray-500',
        textColor: 'text-gray-900',
        icon: <Trophy className="w-4 h-4" />,
      };
    }
    if (rank === 3) {
      return {
        bgColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
        textColor: 'text-orange-900',
        icon: <Trophy className="w-4 h-4" />,
      };
    }
    return {
      bgColor: 'bg-cream',
      textColor: 'text-ink',
      icon: null,
    };
  };

  const rankStyle = getRankStyle();

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
          isCurrentUser
            ? 'bg-teal-600/10 border border-teal-600/20'
            : 'hover:bg-cream/50'
        }`}
      >
        {/* Rank */}
        <div
          className={`w-8 h-8 rounded-full ${rankStyle.bgColor} ${rankStyle.textColor} flex items-center justify-center font-bold text-sm flex-shrink-0`}
        >
          {rankStyle.icon || rank}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0 overflow-hidden">
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            getInitials(displayName)
          )}
        </div>

        {/* Name and Points */}
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-teal-600' : 'text-ink'}`}>
            {displayName} {isCurrentUser && '(You)'}
          </div>
          <div className="text-xs text-ink/60">{points.toLocaleString()} pts</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        isCurrentUser
          ? 'bg-teal-600/10 border-2 border-teal-600 shadow-lg'
          : 'bg-paper hover:shadow-md border border-cream'
      }`}
    >
      {/* Rank Badge */}
      <div
        className={`w-12 h-12 rounded-full ${rankStyle.bgColor} ${rankStyle.textColor} flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md`}
      >
        {rankStyle.icon || rank}
      </div>

      {/* User Avatar */}
      <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-semibold text-base flex-shrink-0 overflow-hidden shadow-md">
        {photoURL ? (
          <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          getInitials(displayName)
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-base truncate ${isCurrentUser ? 'text-teal-600' : 'text-ink'}`}>
          {displayName}
          {isCurrentUser && <span className="ml-2 text-sm font-normal">(You)</span>}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {/* Points */}
          <div className="flex items-center gap-1 text-ink/70">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-600" />
            <span className="text-sm font-medium">{points.toLocaleString()}</span>
          </div>

          {/* Badge Count */}
          {badgeCount > 0 && (
            <div className="flex items-center gap-1 text-ink/70">
              <Award className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium">{badgeCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rank Change Indicator (future feature) */}
      {/* Could add rank change arrows here */}
    </div>
  );
}
