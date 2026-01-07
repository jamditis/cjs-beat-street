/**
 * Scavenger hunt service for Beat Street
 * Handles hunt items, check-ins, progress tracking, and leaderboard
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  FirestoreError,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { VenueId } from '../types/venue';
import {
  HuntItem,
  HuntProgress,
  CheckIn,
  CheckInMethod,
  LeaderboardEntry,
  HUNT_POINTS,
  HuntStats,
  HuntItemType,
} from '../types/gamification';

/**
 * Fetch all hunt items for a specific venue
 */
export async function getHuntItems(venueId: VenueId): Promise<HuntItem[]> {
  try {
    const q = query(
      collection(db, 'hunt_items'),
      where('venueId', '==', venueId),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as HuntItem[];
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[scavenger] Failed to fetch hunt items:', e.code, e.message);
    throw error;
  }
}

/**
 * Get a single hunt item by ID
 */
export async function getHuntItem(itemId: string): Promise<HuntItem | null> {
  try {
    const docRef = doc(db, 'hunt_items', itemId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as HuntItem;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[scavenger] Failed to fetch hunt item:', e.code, e.message);
    throw error;
  }
}

/**
 * Get user's hunt progress
 */
export async function getProgress(
  userId: string,
  venueId: VenueId
): Promise<HuntProgress | null> {
  try {
    const docRef = doc(db, 'hunt_progress', `${userId}_${venueId}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      ...docSnap.data(),
    } as HuntProgress;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[scavenger] Failed to fetch progress:', e.code, e.message);
    throw error;
  }
}

/**
 * Check if user has already collected a specific item
 */
export async function isCompleted(
  userId: string,
  itemId: string,
  venueId: VenueId
): Promise<boolean> {
  try {
    const progress = await getProgress(userId, venueId);
    if (!progress) {
      return false;
    }

    return progress.completedItems.some((checkIn) => checkIn.itemId === itemId);
  } catch (error) {
    console.error('[scavenger] Failed to check completion:', error);
    return false;
  }
}

/**
 * Record a check-in and award points
 * Returns updated progress
 */
export async function checkIn(
  userId: string,
  itemId: string,
  venueId: VenueId,
  method: CheckInMethod,
  location?: { x: number; y: number; zone: string }
): Promise<HuntProgress> {
  try {
    // Check if item exists and is active
    const item = await getHuntItem(itemId);
    if (!item || !item.isActive) {
      throw new Error('Hunt item not found or inactive');
    }

    // Check if already completed
    const alreadyCompleted = await isCompleted(userId, itemId, venueId);
    if (alreadyCompleted) {
      throw new Error('Item already collected');
    }

    // Get current progress or create new
    const progressRef = doc(db, 'hunt_progress', `${userId}_${venueId}`);
    const progressSnap = await getDoc(progressRef);

    const checkInRecord: CheckIn = {
      itemId,
      timestamp: serverTimestamp() as Timestamp,
      method,
      location,
    };

    let newProgress: HuntProgress;

    if (!progressSnap.exists()) {
      // Create new progress
      newProgress = {
        userId,
        venueId,
        completedItems: [checkInRecord],
        totalPoints: item.points,
        startedAt: serverTimestamp() as Timestamp,
        lastCheckInAt: serverTimestamp() as Timestamp,
      };
    } else {
      // Update existing progress
      const existingProgress = progressSnap.data() as HuntProgress;
      const completedItems = [...existingProgress.completedItems, checkInRecord];
      const totalPoints = existingProgress.totalPoints + item.points;

      newProgress = {
        ...existingProgress,
        completedItems,
        totalPoints,
        lastCheckInAt: serverTimestamp() as Timestamp,
      };
    }

    // Check if hunt is now complete (need to fetch all items to check)
    const allItems = await getHuntItems(venueId);
    const isNowComplete = newProgress.completedItems.length === allItems.length;

    if (isNowComplete && !newProgress.completedAt) {
      newProgress.completedAt = serverTimestamp() as Timestamp;
      newProgress.totalPoints += HUNT_POINTS.COMPLETION_BONUS;
    }

    // Save progress
    await setDoc(progressRef, newProgress);

    return newProgress;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[scavenger] Failed to check in:', e.code, e.message);
    throw error;
  }
}

/**
 * Get leaderboard entries
 * Returns top hunters sorted by points
 */
export async function getLeaderboard(
  venueId: VenueId,
  limitCount = 10
): Promise<LeaderboardEntry[]> {
  try {
    const q = query(
      collection(db, 'hunt_progress'),
      where('venueId', '==', venueId),
      orderBy('totalPoints', 'desc'),
      orderBy('lastCheckInAt', 'asc'), // Earlier completion wins ties
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        userId: data.userId,
        displayName: data.displayName || 'Anonymous',
        totalPoints: data.totalPoints,
        itemsCollected: data.completedItems?.length || 0,
        completedAt: data.completedAt,
        lastCheckInAt: data.lastCheckInAt,
        rank: index + 1,
      } as LeaderboardEntry;
    });

    return entries;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[scavenger] Failed to fetch leaderboard:', e.code, e.message);
    throw error;
  }
}

/**
 * Calculate hunt statistics for a user
 */
export async function getHuntStats(
  userId: string,
  venueId: VenueId
): Promise<HuntStats> {
  try {
    const [progress, allItems] = await Promise.all([
      getProgress(userId, venueId),
      getHuntItems(venueId),
    ]);

    const completedItemIds = new Set(
      progress?.completedItems.map((c) => c.itemId) || []
    );

    // Initialize stats by type
    const byType = {
      [HuntItemType.SPONSOR]: { completed: 0, total: 0, points: 0 },
      [HuntItemType.SESSION]: { completed: 0, total: 0, points: 0 },
      [HuntItemType.LANDMARK]: { completed: 0, total: 0, points: 0 },
    };

    // Count items by type
    allItems.forEach((item) => {
      byType[item.type].total++;
      if (completedItemIds.has(item.id)) {
        byType[item.type].completed++;
        byType[item.type].points += item.points;
      }
    });

    const completedCount = completedItemIds.size;
    const totalPoints = progress?.totalPoints || 0;
    const possiblePoints =
      allItems.reduce((sum, item) => sum + item.points, 0) +
      HUNT_POINTS.COMPLETION_BONUS;
    const isCompleted = completedCount === allItems.length;

    return {
      totalItems: allItems.length,
      completedItems: completedCount,
      totalPoints,
      possiblePoints,
      completionPercentage: (completedCount / allItems.length) * 100,
      byType,
      isCompleted,
    };
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[scavenger] Failed to calculate stats:', e.code, e.message);
    throw error;
  }
}

/**
 * Get nearby hunt items within a radius
 */
export function getNearbyHuntItems(
  items: HuntItem[],
  playerPosition: { x: number; y: number },
  radius: number
): HuntItem[] {
  return items.filter((item) => {
    const dx = item.location.x - playerPosition.x;
    const dy = item.location.y - playerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radius;
  });
}

/**
 * Batch create hunt items (useful for seeding)
 */
export async function createHuntItems(items: Omit<HuntItem, 'id'>[]): Promise<void> {
  try {
    const batch = writeBatch(db);

    items.forEach((item) => {
      const docRef = doc(collection(db, 'hunt_items'));
      batch.set(docRef, {
        ...item,
        isActive: item.isActive ?? true,
      });
    });

    await batch.commit();
    console.log(`[scavenger] Created ${items.length} hunt items`);
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[scavenger] Failed to create hunt items:', e.code, e.message);
    throw error;
  }
}

/**
 * Update user's display name in their progress (for leaderboard)
 */
export async function updateProgressDisplayName(
  userId: string,
  venueId: VenueId,
  displayName: string
): Promise<void> {
  try {
    const progressRef = doc(db, 'hunt_progress', `${userId}_${venueId}`);
    await setDoc(progressRef, { displayName }, { merge: true });
  } catch (error) {
    const e = error as FirestoreError;
    console.error(
      '[scavenger] Failed to update display name:',
      e.code,
      e.message
    );
    throw error;
  }
}
