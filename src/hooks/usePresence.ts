import { useState, useEffect, useCallback } from 'react';
import { updatePresence, subscribeToZonePresence, goOffline, PresenceData } from '../services/presence';
import { eventBus } from '../lib/EventBus';

interface UsePresenceOptions {
  uid: string;
  displayName: string;
  shareLocation: boolean;
}

export function usePresence(options: UsePresenceOptions | null) {
  const [nearbyUsers, setNearbyUsers] = useState<PresenceData[]>([]);
  const [currentZone, setCurrentZone] = useState<string>('');

  // Update presence when zone changes
  useEffect(() => {
    if (!options || !currentZone) return;

    updatePresence(options.uid, {
      uid: options.uid,
      displayName: options.displayName,
      zone: currentZone,
      shareLocation: options.shareLocation,
      status: 'active',
    });
  }, [options, currentZone]);

  // Subscribe to nearby users in the same zone
  useEffect(() => {
    if (!currentZone || !options?.shareLocation) {
      setNearbyUsers([]);
      return;
    }

    const unsubscribe = subscribeToZonePresence(currentZone, (users) => {
      // Filter out self
      const others = users.filter((u) => u.uid !== options.uid);
      setNearbyUsers(others);
      eventBus.emit('presence-update', { users: others });
    });

    return unsubscribe;
  }, [currentZone, options]);

  // Listen for player movement to update zone
  useEffect(() => {
    const unsubscribe = eventBus.on('player-moved', (data: unknown) => {
      const moveData = data as { zone: string };
      if (moveData.zone !== currentZone) {
        setCurrentZone(moveData.zone);
      }
    });

    return unsubscribe;
  }, [currentZone]);

  // Go offline when component unmounts or user leaves
  useEffect(() => {
    if (!options) return;

    const handleBeforeUnload = () => {
      goOffline(options.uid);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      goOffline(options.uid);
    };
  }, [options]);

  const updateStatus = useCallback(
    (status: 'active' | 'idle' | 'away') => {
      if (options) {
        updatePresence(options.uid, { status });
      }
    },
    [options]
  );

  return {
    nearbyUsers,
    currentZone,
    updateStatus,
  };
}
