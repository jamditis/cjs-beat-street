import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronDown, ChevronUp, Hand, MapPin } from 'lucide-react';
import { eventBus, UserPresence } from '../lib/EventBus';
import { useAttendees } from '../hooks/useAttendees';

export function PresenceList() {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [groupByZone, setGroupByZone] = useState(false);
  const { waveAt, findOnMap } = useAttendees();

  useEffect(() => {
    const unsubscribe = eventBus.on('presence-update', (data: unknown) => {
      const presenceData = data as { users: UserPresence[] };
      setUsers(presenceData.users);
    });

    return unsubscribe;
  }, []);

  // Group users by zone
  const usersByZone = useMemo(() => {
    return users.reduce((acc, user) => {
      if (!acc[user.zone]) {
        acc[user.zone] = [];
      }
      acc[user.zone].push(user);
      return acc;
    }, {} as Record<string, UserPresence[]>);
  }, [users]);

  const zones = useMemo(() => Object.keys(usersByZone), [usersByZone]);
  const shouldGroupByZone = zones.length > 1;

  const handleWave = async (uid: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await waveAt(uid);
  };

  const handleFindOnMap = (uid: string, event: React.MouseEvent) => {
    event.stopPropagation();
    findOnMap(uid);
  };

  const handleUserClick = (uid: string) => {
    eventBus.emit('attendee-selected', { uid });
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getStatusColor = (status: 'active' | 'idle' | 'away'): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'away':
      default:
        return 'bg-gray-400';
    }
  };

  const renderUser = (user: UserPresence) => (
    <motion.div
      key={user.uid}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-cream/50 transition-colors cursor-pointer group"
      onClick={() => handleUserClick(user.uid)}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
          {getInitials(user.displayName)}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-paper ${getStatusColor(
            user.status
          )}`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{user.displayName}</p>
        <p className="text-xs text-ink/60 truncate">{user.zone}</p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => handleWave(user.uid, e)}
          className="p-1.5 rounded-full hover:bg-teal-100 text-teal-600 transition-colors"
          aria-label="Send wave"
          title="Send wave"
        >
          <Hand className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => handleFindOnMap(user.uid, e)}
          className="p-1.5 rounded-full hover:bg-teal-100 text-teal-600 transition-colors"
          aria-label="Find on map"
          title="Find on map"
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderGroupedUsers = () => {
    return zones.map((zone) => (
      <div key={zone} className="mb-3 last:mb-0">
        <h4 className="text-xs font-semibold text-ink/70 uppercase tracking-wide mb-2 px-2">
          {zone} ({usersByZone[zone].length})
        </h4>
        <div className="space-y-1">
          {usersByZone[zone].map((user) => renderUser(user))}
        </div>
      </div>
    ));
  };

  if (users.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 bg-paper rounded-xl shadow-lg z-40 overflow-hidden max-w-xs w-full"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-cream transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          <span className="font-semibold text-ink">{users.length} nearby</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-ink/60" />
        ) : (
          <ChevronUp className="w-5 h-5 text-ink/60" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-3">
              {/* Group by zone toggle (if multiple zones) */}
              {shouldGroupByZone && (
                <div className="px-2 py-2 mb-2 border-b border-ink/10">
                  <button
                    onClick={() => setGroupByZone(!groupByZone)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    {groupByZone ? 'Show all' : 'Group by zone'}
                  </button>
                </div>
              )}

              {/* User list */}
              <div className="max-h-80 overflow-y-auto space-y-1">
                {groupByZone && shouldGroupByZone ? (
                  renderGroupedUsers()
                ) : (
                  users.map((user) => renderUser(user))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
