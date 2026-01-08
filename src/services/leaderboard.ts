import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  QueryConstraint,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  LeaderboardEntry,
  LeaderboardUpdate,
  LeaderboardQueryOptions,
  UserRankInfo,
} from '../types/leaderboard';

export async function getLeaderboard(
  options: LeaderboardQueryOptions = {}
): Promise<LeaderboardEntry[]> {
  const {
    limit: maxEntries = 10,
    minPoints = 0,
  } = options;

  const constraints: QueryConstraint[] = [
    where('optedIn', '==', true),
    orderBy('points', 'desc'),
    limit(maxEntries),
  ];

  const q = query(collection(db, 'leaderboard'), ...constraints);
  const snapshot = await getDocs(q);

  const entries = snapshot.docs
    .map((d, index) => ({
      uid: d.id,
      ...d.data(),
      rank: index + 1,
    })) as LeaderboardEntry[];

  return entries.filter(entry => entry.points >= minPoints);
}

export function subscribeToLeaderboard(
  options: LeaderboardQueryOptions = {},
  callback: (entries: LeaderboardEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  const {
    limit: maxEntries = 10,
    minPoints = 0,
  } = options;

  const constraints: QueryConstraint[] = [
    where('optedIn', '==', true),
    orderBy('points', 'desc'),
    limit(maxEntries),
  ];

  const q = query(collection(db, 'leaderboard'), ...constraints);

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const entries = snapshot.docs
        .map((d: QueryDocumentSnapshot<DocumentData>, index: number) => ({
          uid: d.id,
          ...d.data(),
          rank: index + 1,
        })) as LeaderboardEntry[];

      const filtered = entries.filter(entry => entry.points >= minPoints);
      callback(filtered);
    },
    (error: FirestoreError) => {
      console.error('[leaderboard] Subscription error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export async function getUserRank(userId: string): Promise<UserRankInfo | null> {
  const userDoc = await getDoc(doc(db, 'leaderboard', userId));

  if (!userDoc.exists()) {
    return null;
  }

  const userData = userDoc.data() as LeaderboardEntry;

  if (!userData.optedIn) {
    return null;
  }

  const higherScoresQuery = query(
    collection(db, 'leaderboard'),
    where('optedIn', '==', true),
    where('points', '>', userData.points),
    orderBy('points', 'desc')
  );

  const higherScoresSnapshot = await getDocs(higherScoresQuery);
  const rank = higherScoresSnapshot.size + 1;

  let pointsToNextRank: number | null = null;
  if (higherScoresSnapshot.size > 0) {
    const higherScoresDocs = higherScoresSnapshot.docs;
    const nextHigher = higherScoresDocs[higherScoresDocs.length - 1].data() as LeaderboardEntry;
    pointsToNextRank = nextHigher.points - userData.points;
  }

  const lowerScoresQuery = query(
    collection(db, 'leaderboard'),
    where('optedIn', '==', true),
    where('points', '<', userData.points),
    orderBy('points', 'desc'),
    limit(1)
  );

  const lowerScoresSnapshot = await getDocs(lowerScoresQuery);
  let pointsFromPreviousRank: number | null = null;
  if (!lowerScoresSnapshot.empty) {
    const nextLower = lowerScoresSnapshot.docs[0].data() as LeaderboardEntry;
    pointsFromPreviousRank = userData.points - nextLower.points;
  }

  return {
    rank,
    points: userData.points,
    badgeCount: userData.badgeCount,
    optedIn: userData.optedIn,
    pointsToNextRank,
    pointsFromPreviousRank,
  };
}

export async function updateLeaderboardEntry(
  userId: string,
  update: LeaderboardUpdate
): Promise<void> {
  await setDoc(
    doc(db, 'leaderboard', userId),
    {
      ...update,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function optIn(
  userId: string,
  displayName: string,
  photoURL?: string
): Promise<void> {
  const userDoc = await getDoc(doc(db, 'leaderboard', userId));

  if (!userDoc.exists()) {
    await updateLeaderboardEntry(userId, {
      displayName,
      optedIn: true,
      points: 0,
      badgeCount: 0,
      photoURL,
    });
  } else {
    await updateLeaderboardEntry(userId, {
      displayName,
      optedIn: true,
      photoURL,
    });
  }
}

export async function optOut(userId: string): Promise<void> {
  await updateLeaderboardEntry(userId, {
    optedIn: false,
  });
}

export async function isOptedIn(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'leaderboard', userId));

    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data() as LeaderboardEntry;
    return userData.optedIn;
  } catch (error) {
    console.error('[leaderboard] Failed to check opt-in status:', error);
    return false;
  }
}

export async function addPoints(
  userId: string,
  pointsToAdd: number,
  displayName: string
): Promise<void> {
  const userDoc = await getDoc(doc(db, 'leaderboard', userId));

  let currentPoints = 0;
  let currentBadgeCount = 0;
  let optedIn = false;

  if (userDoc.exists()) {
    const data = userDoc.data() as LeaderboardEntry;
    currentPoints = data.points;
    currentBadgeCount = data.badgeCount;
    optedIn = data.optedIn;
  }

  await updateLeaderboardEntry(userId, {
    displayName,
    points: currentPoints + pointsToAdd,
    badgeCount: currentBadgeCount,
    optedIn,
  });
}

export async function updateBadgeCount(
  userId: string,
  badgeCount: number
): Promise<void> {
  await updateLeaderboardEntry(userId, {
    badgeCount,
  });
}
