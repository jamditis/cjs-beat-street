import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';

export interface PresenceData {
  uid: string;
  displayName: string;
  zone: string;
  shareLocation: boolean;
  status: 'active' | 'idle' | 'away';
  updatedAt: ReturnType<typeof serverTimestamp>;
}

export interface PresenceError {
  code: string;
  message: string;
  operation: 'update' | 'subscribe' | 'offline';
}

export async function updatePresence(
  uid: string,
  data: Partial<PresenceData>
): Promise<boolean> {
  try {
    await setDoc(
      doc(db, 'presence', uid),
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[presence] Failed to update presence:', e.code, e.message);
    return false;
  }
}

export function subscribeToZonePresence(
  zone: string,
  callback: (users: PresenceData[]) => void,
  onError?: (error: PresenceError) => void
): () => void {
  const q = query(
    collection(db, 'presence'),
    where('zone', '==', zone),
    where('shareLocation', '==', true),
    where('status', 'in', ['active', 'idle'])
  );

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
