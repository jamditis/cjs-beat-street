import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  FirestoreError,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { VenueId } from '../types/venue';

export interface UserPresence {
  uid: string;
  displayName: string;
  venueId?: VenueId;
  mapId?: string; // 'outdoor' or indoor venue ID
  zone: string;
  floor?: number;
  status: 'active' | 'idle' | 'away';
  shareLocation: boolean;
  updatedAt: Timestamp | Date;
}

/**
 * @deprecated Use UserPresence instead
 */
export interface PresenceData {
  uid: string;
  displayName: string;
  zone: string;
  shareLocation: boolean;
  status: 'active' | 'idle' | 'away';
  venueId?: VenueId;
  mapId?: string;
  floor?: number;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

export interface PresenceError {
  code: string;
  message: string;
  operation: 'update' | 'subscribe' | 'offline';
}

export interface PresenceUpdateData {
  displayName?: string;
  venueId?: VenueId;
  mapId?: string;
  zone?: string;
  floor?: number;
  status?: 'active' | 'idle' | 'away';
  shareLocation?: boolean;
}

export async function updatePresence(
  uid: string,
  data: PresenceUpdateData
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'presence', uid),
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[presence] Failed to update presence:', e.code, e.message);
    throw error;
  }
}

export interface PresenceSubscriptionOptions {
  venueId: VenueId;
  mapId?: string;
  floor?: number;
  onUpdate: (users: UserPresence[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Subscribe to presence updates filtered by venue.
 * Uses composite indexes for efficient queries.
 */
export function subscribeToPresence(
  options: PresenceSubscriptionOptions
): () => void {
  const { venueId, mapId, floor, onUpdate, onError } = options;

  // Build query constraints matching our Firestore indexes
  const constraints: QueryConstraint[] = [
    where('venueId', '==', venueId),
    where('shareLocation', '==', true),
  ];

  // Add optional filters
  if (mapId !== undefined) {
    constraints.push(where('mapId', '==', mapId));
  }

  // Order by updatedAt descending (matches our indexes)
  constraints.push(orderBy('updatedAt', 'desc'));

  const q = query(collection(db, 'presence'), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      let users = snapshot.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      })) as UserPresence[];

      // Filter by floor in memory if specified (to avoid complex index requirements)
      if (floor !== undefined) {
        users = users.filter((u) => u.floor === floor);
      }

      onUpdate(users);
    },
    (error) => {
      console.error('[presence] Subscription error:', error.code, error.message);
      if (onError) {
        onError(new Error(`${error.code}: ${error.message}`));
      }
    }
  );
}

/**
 * @deprecated Use subscribeToPresence instead for venue-based filtering
 */
export interface LegacyPresenceSubscriptionOptions {
  zone: string;
  venueId?: VenueId;
  mapId?: string;
  floor?: number;
}

/**
 * @deprecated Use subscribeToPresence instead
 */
export function subscribeToZonePresence(
  options: string | LegacyPresenceSubscriptionOptions,
  callback: (users: PresenceData[]) => void,
  onError?: (error: PresenceError) => void
): () => void {
  // Support both legacy string zone and new options object
  const zone = typeof options === 'string' ? options : options.zone;
  const venueId = typeof options === 'string' ? undefined : options.venueId;
  const mapId = typeof options === 'string' ? undefined : options.mapId;
  const floor = typeof options === 'string' ? undefined : options.floor;

  // Build query constraints
  const constraints: QueryConstraint[] = [
    where('zone', '==', zone),
    where('shareLocation', '==', true),
    where('status', 'in', ['active', 'idle']),
  ];

  // Add venue filtering if provided
  if (venueId) {
    constraints.push(where('venueId', '==', venueId));
  }
  if (mapId) {
    constraints.push(where('mapId', '==', mapId));
  }
  if (floor !== undefined) {
    constraints.push(where('floor', '==', floor));
  }

  const q = query(collection(db, 'presence'), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      })) as PresenceData[];
      callback(users);
    },
    (error) => {
      console.error('[presence] Subscription error:', error.code, error.message);
      if (onError) {
        onError({
          code: error.code,
          message: error.message,
          operation: 'subscribe',
        });
      }
    }
  );
}

export async function goOffline(uid: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'presence', uid));
    return true;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[presence] Failed to go offline:', e.code, e.message);
    return false;
  }
}
