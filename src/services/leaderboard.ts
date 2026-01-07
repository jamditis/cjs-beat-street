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
  FirestoreError,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  LeaderboardEntry,
  LeaderboardUpdate,
  LeaderboardQueryOptions,
  UserRankInfo,
} from '../types/leaderboard';

/**
 * Fetch the top users on the leaderboard
 * @param options Query options (limit, period, minPoints)
 * @returns Array of leaderboard entries with calculated ranks
 */
export async function getLeaderboard(
  options: LeaderboardQueryOptions = {}
): Promise<LeaderboardEntry[]> {
  try {
    const {
      limit: maxEntries = 10,
      minPoints = 0,
    } = options;

    // Build query constraints
    const constraints: QueryConstraint[] = [
      where('optedIn', '==', true),
      orderBy('points', 'desc'),
      limit(maxEntries),
    ];

    const q = query(collection(db, 'leaderboard'), ...constraints);
    const snapshot = await getDocs(q);

    // Map documents and calculate ranks
    const entries = snapshot.docs
      .map((d, index) => ({
        uid: d.id,
        ...d.data(),
        rank: index + 1,
      })) as LeaderboardEntry[];

    // Filter by minimum points if specified
    return entries.filter((entry) => entry.points >= minPoints);
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[leaderboard] Failed to fetch leaderboard:', e.code, e.message);
    throw error;
  }
}

/**
 * Subscribe to real-time leaderboard updates
 * @param options Query options
 * @param callback Function to call with updated leaderboard
 * @param onError Optional error handler
 * @returns Unsubscribe function
 */
export function subscribeToLeaderboard(
  options: LeaderboardQueryOptions = {},
  callback: (entries: LeaderboardEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  const {
    limit: maxEntries = 10,
    minPoints = 0,
  } = options;

  // Build query constraints
  const constraints: QueryConstraint[] = [
    where('optedIn', '==', true),
    orderBy('points', 'desc'),
    limit(maxEntries),
  ];

  const q = query(collection(db, 'leaderboard'), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs
        .map((d, index) => ({
          uid: d.id,
          ...d.data(),
          rank: index + 1,
        })) as LeaderboardEntry[];

      // Filter by minimum points if specified
      const filtered = entries.filter((entry) => entry.points >= minPoints);
      callback(filtered);
    },
    (error) => {
      console.error('[leaderboard] Subscription error:', error.code, error.message);
      if (onError) {
        onError(new Error(`${error.code}: ${error.message}`));
      }
    }
  );
}

/**
 * Get a specific user's rank and position info
 * @param userId User ID to look up
 * @returns User's rank info or null if not opted in or not found
 */
export async function getUserRank(userId: string): Promise<UserRankInfo | null> {
  try {
    const userDoc = await getDoc(doc(db, 'leaderboard', userId));

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data() as LeaderboardEntry;

    if (!userData.optedIn) {
      return null;
    }

    // Query users with more points to find rank
    const higherScoresQuery = query(
      collection(db, 'leaderboard'),
      where('optedIn', '==', true),
      where('points', '>', userData.points),
      orderBy('points', 'desc')
    );

    const higherScoresSnapshot = await getDocs(higherScoresQuery);
    const rank = higherScoresSnapshot.size + 1;

    // Get next higher rank user (if exists)
    let pointsToNextRank: number | null = null;
    if (higherScoresSnapshot.size > 0) {
      const higherScoresDocs = higherScoresSnapshot.docs;
      const nextHigher = higherScoresDocs[higherScoresDocs.length - 1].data() as LeaderboardEntry;
      pointsToNextRank = nextHigher.points - userData.points;
    }

    // Get next lower rank user (if exists)
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
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[leaderboard] Failed to get user rank:', e.code, e.message);
    throw error;
  }
}

/**
 * Update or create a user's leaderboard entry
 * @param userId User ID
 * @param update Update data
 */
export async function updateLeaderboardEntry(
  userId: string,
  update: LeaderboardUpdate
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'leaderboard', userId),
      {
        ...update,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[leaderboard] Failed to update entry:', e.code, e.message);
    throw error;
  }
}

/**
 * Opt user into the public leaderboard
 * @param userId User ID
 * @param displayName User's display name
 * @param photoURL Optional photo URL
 */
export async function optIn(
  userId: string,
  displayName: string,
  photoURL?: string
): Promise<void> {
  try {
    await updateLeaderboardEntry(userId, {
      displayName,
      optedIn: true,
      photoURL,
    });
  } catch (error) {
    console.error('[leaderboard] Failed to opt in:', error);
    throw error;
  }
}

/**
 * Opt user out of the public leaderboard
 * @param userId User ID
 */
export async function optOut(userId: string): Promise<void> {
  try {
    await updateLeaderboardEntry(userId, {
      optedIn: false,
    });
  } catch (error) {
    console.error('[leaderboard] Failed to opt out:', error);
    throw error;
  }
}

/**
 * Check if a user has opted into the leaderboard
 * @param userId User ID
 * @returns True if opted in, false otherwise
 */
export async function isOptedIn(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'leaderboard', userId));

    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data() as LeaderboardEntry;
    return userData.optedIn || false;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[leaderboard] Failed to check opt-in status:', e.code, e.message);
    return false;
  }
}

/**
 * Increment a user's points by a certain amount
 * @param userId User ID
 * @param pointsToAdd Points to add
 * @param displayName User's display name (for creating entry if doesn't exist)
 */
export async function addPoints(
  userId: string,
  pointsToAdd: number,
  displayName: string
): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'leaderboard', userId));

    let currentPoints = 0;
    let currentBadgeCount = 0;
    let optedIn = false;

    if (userDoc.exists()) {
      const data = userDoc.data() as LeaderboardEntry;
      currentPoints = data.points || 0;
      currentBadgeCount = data.badgeCount || 0;
      optedIn = data.optedIn || false;
    }

    await updateLeaderboardEntry(userId, {
      displayName,
      points: currentPoints + pointsToAdd,
      badgeCount: currentBadgeCount,
      optedIn,
    });
  } catch (error) {
    console.error('[leaderboard] Failed to add points:', error);
    throw error;
  }
}

/**
 * Update a user's badge count
 * @param userId User ID
 * @param badgeCount New badge count
 */
export async function updateBadgeCount(
  userId: string,
  badgeCount: number
): Promise<void> {
  try {
    await updateLeaderboardEntry(userId, {
      badgeCount,
    });
  } catch (error) {
    console.error('[leaderboard] Failed to update badge count:', error);
    throw error;
  }
}
