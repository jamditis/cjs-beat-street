/**
 * Realtime Database presence tracking for Beat Street
 *
 * Uses Firebase RTDB instead of Firestore for presence because:
 * - Free tier: 100K simultaneous connections (vs Firestore document writes)
 * - Native onDisconnect() for automatic cleanup when clients disconnect
 * - Lower latency (~600ms vs 1500ms for Firestore)
 * - Cost reduction: ~$35 to $0 per event
 *
 * Data structure in RTDB:
 * /presence/{uid}
 *   - displayName: string
 *   - zone: string
 *   - venueId: string (optional)
 *   - mapId: string (optional)
 *   - floor: number (optional)
 *   - status: 'active' | 'idle' | 'away'
 *   - shareLocation: boolean
 *   - updatedAt: number (server timestamp)
 */

import {
  ref,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
  off,
  DataSnapshot,
} from 'firebase/database';
import { rtdb } from './firebase';
import { VenueId } from '../types/venue';

/**
 * Realtime presence data structure stored in RTDB
 */
export interface RealtimePresenceData {
  uid: string;
  displayName: string;
  zone: string;
  venueId?: VenueId;
  mapId?: string;
  floor?: number;
  status: 'active' | 'idle' | 'away';
  shareLocation: boolean;
  updatedAt: number | object; // number when read, ServerValue when written
}

/**
 * Options for setting up presence
 */
export interface SetupPresenceOptions {
  uid: string;
  displayName: string;
  zone: string;
  venueId?: VenueId;
  mapId?: string;
  floor?: number;
  shareLocation: boolean;
}

/**
 * Options for updating presence
 */
export interface UpdatePresenceOptions {
  displayName?: string;
  zone?: string;
  venueId?: VenueId;
  mapId?: string;
  floor?: number;
  status?: 'active' | 'idle' | 'away';
  shareLocation?: boolean;
}

/**
 * Callback type for presence updates
 */
export type PresenceCallback = (users: RealtimePresenceData[]) => void;

/**
 * Sets up presence for a user with automatic disconnect cleanup.
 * This should be called once when the user connects/authenticates.
 *
 * The onDisconnect handler ensures the user's presence is removed
 * even if the browser tab is closed or the connection is lost.
 *
 * @param options - Setup options including uid, displayName, and zone
 * @returns Promise that resolves when presence is set up
 */
export async function setupPresence(options: SetupPresenceOptions): Promise<void> {
  const { uid, displayName, zone, venueId, mapId, floor, shareLocation } = options;
  const presenceRef = ref(rtdb, `presence/${uid}`);

  // Set up onDisconnect handler FIRST (before setting data)
  // This ensures cleanup happens even if the user disconnects immediately
  await onDisconnect(presenceRef).remove();

  // Now set the presence data
  const presenceData: Omit<RealtimePresenceData, 'uid'> = {
    displayName,
    zone,
    status: 'active',
    shareLocation,
    updatedAt: serverTimestamp(),
  };

  // Add optional venue data
  if (venueId !== undefined) {
    (presenceData as RealtimePresenceData).venueId = venueId;
  }
  if (mapId !== undefined) {
    (presenceData as RealtimePresenceData).mapId = mapId;
  }
  if (floor !== undefined) {
    (presenceData as RealtimePresenceData).floor = floor;
  }

  await set(presenceRef, presenceData);

  console.log('[rtdb-presence] Presence set up for user:', uid);
}

/**
 * Updates the user's current zone and optionally other presence data.
 *
 * @param uid - User ID
 * @param data - Data to update (zone, status, venue info, etc.)
 * @returns Promise that resolves when presence is updated
 */
export async function updateZone(uid: string, data: UpdatePresenceOptions): Promise<void> {
  const presenceRef = ref(rtdb, `presence/${uid}`);

  // Build update object, only including defined values
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (data.displayName !== undefined) {
    updateData.displayName = data.displayName;
  }
  if (data.zone !== undefined) {
    updateData.zone = data.zone;
  }
  if (data.venueId !== undefined) {
    updateData.venueId = data.venueId;
  }
  if (data.mapId !== undefined) {
    updateData.mapId = data.mapId;
  }
  if (data.floor !== undefined) {
    updateData.floor = data.floor;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.shareLocation !== undefined) {
    updateData.shareLocation = data.shareLocation;
  }

  await update(presenceRef, updateData);
}

/**
 * Subscribes to all presence changes in the database.
 * Filters to only return users who have shareLocation enabled.
 *
 * @param callback - Function called whenever presence data changes
 * @param options - Optional filter options (venueId, mapId, floor)
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToPresence(
  callback: PresenceCallback,
  options?: {
    venueId?: VenueId;
    mapId?: string;
    floor?: number;
    excludeUid?: string;
  }
): () => void {
  const presenceRef = ref(rtdb, 'presence');

  const listener = (snapshot: DataSnapshot) => {
    const users: RealtimePresenceData[] = [];

    snapshot.forEach((childSnapshot) => {
      const uid = childSnapshot.key;
      const data = childSnapshot.val();

      if (!uid || !data) return;

      // Skip users who don't share location
      if (!data.shareLocation) return;

      // Skip excluded user (self)
      if (options?.excludeUid && uid === options.excludeUid) return;

      // Filter by venue if specified
      if (options?.venueId && data.venueId !== options.venueId) return;

      // Filter by map if specified
      if (options?.mapId && data.mapId !== options.mapId) return;

      // Filter by floor if specified
      if (options?.floor !== undefined && data.floor !== options.floor) return;

      users.push({
        uid,
        displayName: data.displayName || 'Anonymous',
        zone: data.zone || '',
        venueId: data.venueId,
        mapId: data.mapId,
        floor: data.floor,
        status: data.status || 'active',
        shareLocation: data.shareLocation,
        updatedAt: data.updatedAt || Date.now(),
      });
    });

    callback(users);
  };

  onValue(presenceRef, listener);

  // Return unsubscribe function
  return () => {
    off(presenceRef, 'value', listener);
  };
}

/**
 * Subscribes to presence changes for a specific zone.
 * More efficient than subscribeToPresence when you only need zone data.
 *
 * Note: RTDB doesn't support complex queries like Firestore,
 * so filtering is done client-side after fetching all presence data.
 *
 * @param zone - Zone to filter by
 * @param callback - Function called whenever presence data changes
 * @param options - Optional additional filter options
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToZonePresence(
  zone: string,
  callback: PresenceCallback,
  options?: {
    venueId?: VenueId;
    mapId?: string;
    floor?: number;
    excludeUid?: string;
  }
): () => void {
  return subscribeToPresence(
    (users) => {
      // Filter to only users in the specified zone
      const zoneUsers = users.filter((user) => user.zone === zone);
      callback(zoneUsers);
    },
    options
  );
}

/**
 * Removes user presence from RTDB.
 * Called when user explicitly goes offline or signs out.
 *
 * Note: The onDisconnect handler set up in setupPresence will also
 * clean up presence if the connection is lost unexpectedly.
 *
 * @param uid - User ID to remove
 * @returns Promise that resolves when presence is removed
 */
export async function removePresence(uid: string): Promise<void> {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  await remove(presenceRef);
  console.log('[rtdb-presence] Presence removed for user:', uid);
}

/**
 * Cancels the onDisconnect handler for a user.
 * Call this if you want to prevent automatic cleanup
 * (e.g., when transferring to a new session).
 *
 * @param uid - User ID
 * @returns Promise that resolves when handler is cancelled
 */
export async function cancelOnDisconnect(uid: string): Promise<void> {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  await onDisconnect(presenceRef).cancel();
}

/**
 * Gets a single user's presence data.
 * Useful for checking if a specific user is online.
 *
 * @param uid - User ID to check
 * @returns Promise with user's presence data or null if not found
 */
export function getUserPresence(
  uid: string,
  callback: (data: RealtimePresenceData | null) => void
): () => void {
  const presenceRef = ref(rtdb, `presence/${uid}`);

  const listener = (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.val();
    callback({
      uid,
      displayName: data.displayName || 'Anonymous',
      zone: data.zone || '',
      venueId: data.venueId,
      mapId: data.mapId,
      floor: data.floor,
      status: data.status || 'active',
      shareLocation: data.shareLocation ?? false,
      updatedAt: data.updatedAt || Date.now(),
    });
  };

  onValue(presenceRef, listener);

  return () => {
    off(presenceRef, 'value', listener);
  };
}
