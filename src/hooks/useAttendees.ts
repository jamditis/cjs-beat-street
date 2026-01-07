import { useState, useEffect, useCallback } from 'react';
import { eventBus, UserPresence } from '../lib/EventBus';

export interface AttendeeDetails extends UserPresence {
  organization?: string;
  photoURL?: string;
}

export interface UseAttendeesOptions {
  autoFetch?: boolean;
}

export function useAttendees(options: UseAttendeesOptions = {}) {
  const [nearbyAttendees, setNearbyAttendees] = useState<UserPresence[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for presence updates
  useEffect(() => {
    const unsubscribe = eventBus.on('presence-update', (data: unknown) => {
      const presenceData = data as { users: UserPresence[] };
      setNearbyAttendees(presenceData.users);
    });

    return unsubscribe;
  }, []);

  // Listen for attendee selection
  useEffect(() => {
    const unsubscribe = eventBus.on('attendee-selected', (data: unknown) => {
      const selectionData = data as { uid: string };
      if (options.autoFetch) {
        fetchAttendeeDetails(selectionData.uid);
      }
    });

    return unsubscribe;
  }, [options.autoFetch]);

  // Fetch full attendee details
  const fetchAttendeeDetails = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);

    try {
      // Find attendee in nearby list first
      const attendee = nearbyAttendees.find((a) => a.uid === uid);

      if (!attendee) {
        throw new Error('Attendee not found in nearby list');
      }

      // In a real implementation, fetch additional details from Firebase
      // For now, we'll use the presence data and simulate fetching
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Mock additional data - in production, this would be a Firebase call:
      // const attendeeDoc = await getDoc(doc(db, 'verified_attendees', uid));
      const details: AttendeeDetails = {
        ...attendee,
        organization: 'Tech Company', // Would come from Firebase
        photoURL: undefined, // Would come from Firebase
      };

      setSelectedAttendee(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendee details');
      console.error('Error fetching attendee details:', err);
    } finally {
      setLoading(false);
    }
  }, [nearbyAttendees]);

  // Select an attendee
  const selectAttendee = useCallback((uid: string | null) => {
    if (uid === null) {
      setSelectedAttendee(null);
      return;
    }

    fetchAttendeeDetails(uid);
  }, [fetchAttendeeDetails]);

  // Send a wave to an attendee
  const waveAt = useCallback(async (uid: string): Promise<boolean> => {
    try {
      // Emit wave event
      eventBus.emit('send-wave', {
        toUid: uid,
        timestamp: Date.now(),
      });

      // In a real implementation, this would call a Firebase function:
      // await httpsCallable(functions, 'sendWave')({ toUid: uid });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return true;
    } catch (err) {
      console.error('Error sending wave:', err);
      return false;
    }
  }, []);

  // Focus camera on attendee in the game
  const findOnMap = useCallback((uid: string) => {
    eventBus.emit('focus-attendee', { uid });
  }, []);

  // Get attendee by uid from nearby list
  const getAttendee = useCallback((uid: string): UserPresence | undefined => {
    return nearbyAttendees.find((a) => a.uid === uid);
  }, [nearbyAttendees]);

  // Filter attendees by status
  const getAttendeesByStatus = useCallback((status: 'active' | 'idle' | 'away'): UserPresence[] => {
    return nearbyAttendees.filter((a) => a.status === status);
  }, [nearbyAttendees]);

  // Group attendees by zone
  const getAttendeesByZone = useCallback((): Record<string, UserPresence[]> => {
    return nearbyAttendees.reduce((acc, attendee) => {
      if (!acc[attendee.zone]) {
        acc[attendee.zone] = [];
      }
      acc[attendee.zone].push(attendee);
      return acc;
    }, {} as Record<string, UserPresence[]>);
  }, [nearbyAttendees]);

  // Get count of attendees
  const getAttendeeCount = useCallback((): number => {
    return nearbyAttendees.length;
  }, [nearbyAttendees]);

  // Get count by status
  const getStatusCounts = useCallback((): Record<'active' | 'idle' | 'away', number> => {
    return nearbyAttendees.reduce((acc, attendee) => {
      acc[attendee.status] = (acc[attendee.status] || 0) + 1;
      return acc;
    }, { active: 0, idle: 0, away: 0 } as Record<'active' | 'idle' | 'away', number>);
  }, [nearbyAttendees]);

  return {
    // State
    nearbyAttendees,
    selectedAttendee,
    loading,
    error,

    // Actions
    selectAttendee,
    waveAt,
    findOnMap,
    fetchAttendeeDetails,

    // Queries
    getAttendee,
    getAttendeesByStatus,
    getAttendeesByZone,
    getAttendeeCount,
    getStatusCounts,
  };
}
