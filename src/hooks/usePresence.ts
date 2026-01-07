import { useState, useEffect, useCallback } from 'react';
import {
  updatePresence,
  subscribeToZonePresence,
  goOffline,
  PresenceData,
} from '../services/presence';
import { eventBus } from '../lib/EventBus';
import { VenueId } from '../types/venue';

interface UsePresenceOptions {
  uid: string;
  displayName: string;
  shareLocation: boolean;
  venueId?: VenueId;
  mapId?: string;
  floor?: number;
  enabled?: boolean;
}

export function usePresence(options: UsePresenceOptions | null) {
  const [nearbyUsers, setNearbyUsers] = useState<PresenceData[]>([]);
  const [currentZone, setCurrentZone] = useState<string>('');

  // Extract venue context from options
  const venueId = options?.venueId;
  const mapId = options?.mapId;
  const floor = options?.floor;
  const enabled = options?.enabled ?? true;

  // Update presence when zone or venue context changes
  useEffect(() => {
    if (!options || !currentZone || !enabled) return;

    updatePresence(options.uid, {
      displayName: options.displayName,
      zone: currentZone,
      shareLocation: options.shareLocation,
      status: 'active',
      venueId: options.venueId,
      mapId: options.mapId,
      floor: options.floor,
    });
  }, [options, currentZone, enabled]);

  // Subscribe to nearby users in the same zone and venue context
  useEffect(() => {
    if (!currentZone || !options?.shareLocation || !enabled) {
      setNearbyUsers([]);
      return;
    }

    const unsubscribe = subscribeToZonePresence(
      {
        zone: currentZone,
        venueId,
        mapId,
        floor,
      },
      (users) => {
        // Filter out self
        const others = users.filter((u) => u.uid !== options.uid);
        setNearbyUsers(others);
        eventBus.emit('presence-update', { users: others });
      }
    );

    return unsubscribe;
  }, [currentZone, options, venueId, mapId, floor, enabled]);

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
    if (!options || !enabled) return;

    const handleBeforeUnload = () => {
      goOffline(options.uid);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      goOffline(options.uid);
    };
  }, [options, enabled]);

  const updateStatus = useCallback(
    (status: 'active' | 'idle' | 'away') => {
      if (options && enabled) {
        updatePresence(options.uid, { status });
      }
    },
    [options, enabled]
  );

  const updateMyPresence = useCallback(
    async (data: {
      zone?: string;
      status?: 'active' | 'idle' | 'away';
      venueId?: VenueId;
      mapId?: string;
      floor?: number;
    }) => {
      if (!options || !enabled) return false;

      // Use provided venue data or fall back to current context
      const presenceData: Parameters<typeof updatePresence>[1] = {
        ...data,
        venueId: data.venueId ?? venueId,
        mapId: data.mapId ?? mapId,
        floor: data.floor ?? floor,
      };

      return updatePresence(options.uid, presenceData);
    },
    [options, venueId, mapId, floor, enabled]
  );

  return {
    nearbyUsers,
    currentZone,
    updateStatus,
    updateMyPresence,
    venueId,
    mapId,
    floor,
  };
}
