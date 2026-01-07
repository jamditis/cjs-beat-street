import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export interface PresenceData {
  uid: string;
  displayName: string;
  zone: string;
  shareLocation: boolean;
  status: 'active' | 'idle' | 'away';
  lastSeen: ReturnType<typeof serverTimestamp>;
}

export function updatePresence(
  uid: string,
  data: Partial<PresenceData>
): Promise<void> {
  return setDoc(
    doc(db, 'presence', uid),
    {
      ...data,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToZonePresence(
  zone: string,
  callback: (users: PresenceData[]) => void
): () => void {
  const q = query(
    collection(db, 'presence'),
    where('zone', '==', zone),
    where('shareLocation', '==', true),
    where('status', 'in', ['active', 'idle'])
  );

  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    })) as PresenceData[];
    callback(users);
  });
}

export function goOffline(uid: string): Promise<void> {
  return deleteDoc(doc(db, 'presence', uid));
}
