import { useState, useEffect, useCallback, useMemo } from 'react';
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
  maxDistance?: number; // Maximum distance for "nearby" filtering (in pixels)
  clusterDistance?: number; // Distance to cluster attendees (in pixels)
}

interface ClusterGroup {
  id: string;
  centerX: number;
  centerY: number;
  attendees: PresenceData[];
  count: number;
}

export function usePresence(options: UsePresenceOptions | null) {
  const [nearbyUsers, setNearbyUsers] = useState<PresenceData[]>([]);
  const [currentZone, setCurrentZone] = useState<string>('');
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number } | null>(null);

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

  // Listen for player movement to update zone and position
  useEffect(() => {
    const unsubscribe = eventBus.on('player-moved', (data: unknown) => {
      const moveData = data as { zone: string; x: number; y: number };
      if (moveData.zone !== currentZone) {
        setCurrentZone(moveData.zone);
      }
      if (moveData.x !== undefined && moveData.y !== undefined) {
        setCurrentPosition({ x: moveData.x, y: moveData.y });
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

  // Filter users by distance from current position
  const filterByDistance = useCallback(
    (users: PresenceData[], maxDistance?: number): PresenceData[] => {
      if (!currentPosition || !maxDistance) return users;

      // Since we don't have actual positions in PresenceData,
      // this is a placeholder for future implementation
      // In a real app, you'd calculate distance based on zone proximity
      // or actual coordinates if available
      return users;
    },
    [currentPosition]
  );

  // Cluster nearby attendees
  const clusterAttendees = useCallback(
    (users: PresenceData[]): ClusterGroup[] => {
      const clusters: ClusterGroup[] = [];
      const processed = new Set<string>();

      // Group users by zone first (simple clustering)
      const byZone = users.reduce((acc, user) => {
        if (!acc[user.zone]) {
          acc[user.zone] = [];
        }
        acc[user.zone].push(user);
        return acc;
      }, {} as Record<string, PresenceData[]>);

      // Create clusters for zones with 3+ attendees
      for (const [zone, zoneUsers] of Object.entries(byZone)) {
        if (zoneUsers.length >= 3) {
          clusters.push({
            id: `cluster-${zone}`,
            centerX: 0, // Would be calculated from actual positions
            centerY: 0,
            attendees: zoneUsers,
            count: zoneUsers.length,
          });
          zoneUsers.forEach((u) => processed.add(u.uid));
        }
      }

      return clusters;
    },
    [options?.clusterDistance]
  );

  // Get nearby attendees with optional filtering
  const filteredNearbyUsers = useMemo(() => {
    return filterByDistance(nearbyUsers, options?.maxDistance);
  }, [nearbyUsers, filterByDistance, options?.maxDistance]);

  // Get clustered attendees
  const clusters = useMemo(() => {
    return clusterAttendees(filteredNearbyUsers);
  }, [filteredNearbyUsers, clusterAttendees]);

  // Get unclustered attendees (those not in any cluster)
  const unclusteredUsers = useMemo(() => {
    const clusteredUids = new Set(
      clusters.flatMap((c) => c.attendees.map((a) => a.uid))
    );
    return filteredNearbyUsers.filter((u) => !clusteredUids.has(u.uid));
  }, [filteredNearbyUsers, clusters]);

  return {
    nearbyUsers,
    filteredNearbyUsers,
    unclusteredUsers,
    clusters,
    currentZone,
    currentPosition,
    updateStatus,
    updateMyPresence,
    venueId,
    mapId,
    floor,
  };
}
