import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Users, ChevronDown, ChevronUp, Hand, MapPin, RefreshCw } from 'lucide-react';
import { eventBus, UserPresence } from '../lib/EventBus';
import { useAttendees } from '../hooks/useAttendees';
import { AttendeeListSkeleton } from './Skeleton';
import { triggerHaptic } from '../hooks/useHaptic';

// Swipe threshold for dismissing the panel
const SWIPE_THRESHOLD = 100;

export function PresenceList() {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [groupByZone, setGroupByZone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { waveAt, findOnMap } = useAttendees();

  // Swipe-to-dismiss state for mobile
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [0, 150], [1, 0.5]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouch || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const unsubscribe = eventBus.on('presence-update', (data: unknown) => {
      const presenceData = data as { users: UserPresence[] };
      setUsers(presenceData.users);
      setIsLoading(false);
    });

    // Listen for refresh requests from TouchUI
    const unsubscribeRefresh = eventBus.on('presence-refresh-requested', () => {
      handleRefresh();
    });

    // Simulate initial load
    const loadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      unsubscribe();
      unsubscribeRefresh();
      clearTimeout(loadTimer);
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    triggerHaptic('selection');

    // Emit event to refresh presence data
    eventBus.emit('presence-refresh', {});

    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsRefreshing(false);
    triggerHaptic('success');
  }, []);

  // Handle swipe-to-dismiss on mobile
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > SWIPE_THRESHOLD) {
        triggerHaptic('tap');
        setIsExpanded(false);
      }
      dragY.set(0);
    },
    [dragY]
  );

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

  const handleWave = async (uid: string, event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    triggerHaptic('tap');
    await waveAt(uid);
    triggerHaptic('success');
  };

  const handleFindOnMap = (uid: string, event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    triggerHaptic('tap');
    findOnMap(uid);
  };

  const handleUserClick = (uid: string) => {
    triggerHaptic('selection');
    eventBus.emit('attendee-selected', { uid });
  };

  const handleToggleExpand = () => {
    triggerHaptic('tap');
    setIsExpanded(!isExpanded);
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
      className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-cream/50 active:bg-cream transition-colors cursor-pointer group touch-manipulation"
      onClick={() => handleUserClick(user.uid)}
      style={{ touchAction: 'manipulation' }}
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

      {/* Quick Actions - always visible on mobile, hover on desktop */}
      <div className={`flex items-center gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        <button
          onClick={(e) => handleWave(user.uid, e)}
          onTouchEnd={(e) => handleWave(user.uid, e)}
          className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-teal-100 active:bg-teal-200 text-teal-600 transition-colors touch-manipulation"
          aria-label={`Send wave to ${user.displayName}`}
          title="Send wave"
          style={{ touchAction: 'manipulation' }}
        >
          <Hand className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => handleFindOnMap(user.uid, e)}
          onTouchEnd={(e) => handleFindOnMap(user.uid, e)}
          className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-teal-100 active:bg-teal-200 text-teal-600 transition-colors touch-manipulation"
          aria-label={`Find ${user.displayName} on map`}
          title="Find on map"
          style={{ touchAction: 'manipulation' }}
        >
          <MapPin className="w-5 h-5" />
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

  // Don't show anything while loading or if no users
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fixed ${isMobile ? 'bottom-0 left-0 right-0 rounded-t-xl' : 'bottom-4 right-4 rounded-xl max-w-xs w-full'} bg-paper shadow-lg z-40 overflow-hidden safe-area-bottom`}
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-ink/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span className="font-semibold text-ink">Loading...</span>
          </div>
        </div>
        <div className="px-2 py-3">
          <AttendeeListSkeleton count={3} />
        </div>
      </motion.div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      drag={isMobile && isExpanded ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={handleDragEnd}
      style={isMobile && isExpanded ? { y: dragY, opacity: dragOpacity } : {}}
      className={`fixed ${isMobile ? 'bottom-0 left-0 right-0 rounded-t-xl' : 'bottom-4 right-4 rounded-xl max-w-xs w-full'} bg-paper shadow-lg z-40 overflow-hidden safe-area-bottom`}
    >
      {/* Drag handle for mobile when expanded */}
      {isMobile && isExpanded && (
        <div className="flex justify-center py-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-ink/20 rounded-full" />
        </div>
      )}

      <button
        onClick={handleToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-cream active:bg-cream/70 transition-colors touch-manipulation"
        style={{ touchAction: 'manipulation' }}
        aria-expanded={isExpanded}
        aria-controls="presence-list-content"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          <span className="font-semibold text-ink">{users.length} nearby</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            className={`w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-cream active:bg-cream/70 text-ink/60 transition-colors touch-manipulation ${isRefreshing ? 'animate-spin' : ''}`}
            aria-label="Refresh presence list"
            disabled={isRefreshing}
            style={{ touchAction: 'manipulation' }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-ink/60" />
          ) : (
            <ChevronUp className="w-5 h-5 text-ink/60" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="presence-list-content"
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
                    onClick={() => {
                      triggerHaptic('selection');
                      setGroupByZone(!groupByZone);
                    }}
                    className="text-xs text-teal-600 hover:text-teal-700 active:text-teal-800 font-medium py-1 touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {groupByZone ? 'Show all' : 'Group by zone'}
                  </button>
                </div>
              )}

              {/* User list */}
              <div className={`${isMobile ? 'max-h-[50vh]' : 'max-h-80'} overflow-y-auto scroll-touch space-y-1`}>
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
