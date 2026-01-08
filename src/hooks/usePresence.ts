import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  setupPresence,
  updateZone,
  subscribeToPresence as subscribeToRtdbPresence,
  removePresence,
  RealtimePresenceData,
} from '../services/realtime-presence';
import { eventBus } from '../lib/EventBus';
import { VenueId } from '../types/venue';

/**
 * Presence data returned by the hook (maintains API compatibility)
 */
export interface PresenceData {
  uid: string;
  displayName: string;
  zone: string;
  venueId?: VenueId;
  mapId?: string;
  floor?: number;
  status: 'active' | 'idle' | 'away';
  shareLocation: boolean;
  updatedAt: number | object;
}

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

/**
 * React hook for managing user presence using Firebase Realtime Database.
 *
 * This hook:
 * - Sets up presence with automatic disconnect cleanup
 * - Updates presence when zone or venue context changes
 * - Subscribes to nearby users' presence
 * - Handles cleanup on unmount
 *
 * Uses RTDB instead of Firestore for cost efficiency:
 * - Free tier: 100K simultaneous connections
 * - Native onDisconnect() for automatic cleanup
 * - Lower latency (~600ms vs 1500ms)
 */
export function usePresence(options: UsePresenceOptions | null) {
  const [nearbyUsers, setNearbyUsers] = useState<PresenceData[]>([]);
  const [currentZone, setCurrentZone] = useState<string>('');
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSetup, setIsSetup] = useState(false);

  // Track if we've set up presence to avoid duplicate setup
  const setupRef = useRef(false);

  // Extract venue context from options
  const venueId = options?.venueId;
  const mapId = options?.mapId;
  const floor = options?.floor;
  const enabled = options?.enabled ?? true;

  // Set up presence when user connects (one-time setup)
  useEffect(() => {
    if (!options || !enabled || setupRef.current) return;

    const setup = async () => {
      try {
        await setupPresence({
          uid: options.uid,
          displayName: options.displayName,
          zone: currentZone || 'lobby',
          venueId: options.venueId,
          mapId: options.mapId,
          floor: options.floor,
          shareLocation: options.shareLocation,
        });
        setupRef.current = true;
        setIsSetup(true);
        console.log('[usePresence] Presence set up successfully');
      } catch (error) {
        console.error('[usePresence] Failed to set up presence:', error);
      }
    };

    setup();
  }, [options?.uid, options?.displayName, enabled]);

  // Update presence when zone or venue context changes
  useEffect(() => {
    if (!options || !currentZone || !enabled || !isSetup) return;

    updateZone(options.uid, {
      displayName: options.displayName,
      zone: currentZone,
      shareLocation: options.shareLocation,
      status: 'active',
      venueId: options.venueId,
      mapId: options.mapId,
      floor: options.floor,
    }).catch((error) => {
      console.error('[usePresence] Failed to update zone:', error);
    });
  }, [options, currentZone, enabled, isSetup]);

  // Subscribe to nearby users in the same venue context
  useEffect(() => {
    if (!options?.shareLocation || !enabled) {
      setNearbyUsers([]);
      return;
    }

    const unsubscribe = subscribeToRtdbPresence(
      (users: RealtimePresenceData[]) => {
        // Convert RTDB format to hook format (maintains compatibility)
        const formattedUsers: PresenceData[] = users.map((u) => ({
          uid: u.uid,
          displayName: u.displayName,
          zone: u.zone,
          venueId: u.venueId,
          mapId: u.mapId,
          floor: u.floor,
          status: u.status,
          shareLocation: u.shareLocation,
          updatedAt: u.updatedAt,
        }));

        setNearbyUsers(formattedUsers);
        eventBus.emit('presence-update', { users: formattedUsers });
      },
      {
        venueId,
        mapId,
        floor,
        excludeUid: options.uid,
      }
    );

    return unsubscribe;
  }, [options?.shareLocation, options?.uid, venueId, mapId, floor, enabled]);

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

  // Clean up presence when component unmounts or user leaves
  useEffect(() => {
    if (!options || !enabled) return;

    const handleBeforeUnload = () => {
      // Note: removePresence may not complete before page unloads,
      // but the onDisconnect handler set up in setupPresence will
      // ensure cleanup happens on the server side
      removePresence(options.uid).catch(() => {
        // Ignore errors during unload
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (setupRef.current) {
        removePresence(options.uid).catch((error) => {
          console.error('[usePresence] Failed to remove presence:', error);
        });
        setupRef.current = false;
        setIsSetup(false);
      }
    };
  }, [options?.uid, enabled]);

  const updateStatus = useCallback(
    (status: 'active' | 'idle' | 'away') => {
      if (options && enabled && isSetup) {
        updateZone(options.uid, { status }).catch((error) => {
          console.error('[usePresence] Failed to update status:', error);
        });
      }
    },
    [options?.uid, enabled, isSetup]
  );

  const updateMyPresence = useCallback(
    async (data: {
      zone?: string;
      status?: 'active' | 'idle' | 'away';
      venueId?: VenueId;
      mapId?: string;
      floor?: number;
    }) => {
      if (!options || !enabled || !isSetup) return false;

      try {
        await updateZone(options.uid, {
          ...data,
          venueId: data.venueId ?? venueId,
          mapId: data.mapId ?? mapId,
          floor: data.floor ?? floor,
        });
        return true;
      } catch (error) {
        console.error('[usePresence] Failed to update presence:', error);
        return false;
      }
    },
    [options?.uid, venueId, mapId, floor, enabled, isSetup]
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
    isSetup,
  };
}
