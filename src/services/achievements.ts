// Achievement tracking and badge management service

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserAchievements,
  BadgeProgress,
  BadgeAction,
  BadgeActionData,
  Badge,
  BadgeUnlockEvent,
} from '../types/achievements';
import { getAllBadges, getBadgeById } from '../config/badges';
import { eventBus } from '../lib/EventBus';

/**
 * Initialize user achievements document if it doesn't exist
 */
async function ensureUserAchievements(userId: string): Promise<void> {
  const userRef = doc(db, 'achievements', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    const allBadges = getAllBadges();
    const initialBadges: BadgeProgress[] = allBadges.map((badge) => ({
      badgeId: badge.id,
      currentValue: 0,
      targetValue: badge.requirement.targetValue,
      lastUpdated: new Date(),
    }));

    const initialData: UserAchievements = {
      userId,
      badges: initialBadges,
      totalBadges: 0,
      totalPoints: 0,
      districts: [],
      sessionsAttended: [],
      profilesViewed: [],
      scavengerHuntCompleted: false,
      lastUpdated: new Date(),
    };

    await setDoc(userRef, {
      ...initialData,
      lastUpdated: serverTimestamp(),
    });
  }
}

/**
 * Check and update achievement progress based on user action
 */
export async function checkAchievements(
  userId: string,
  action: BadgeAction,
  data: BadgeActionData
): Promise<void> {
  try {
    await ensureUserAchievements(userId);

    const userRef = doc(db, 'achievements', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() as UserAchievements;

    let needsUpdate = false;
    const updates: Partial<UserAchievements> = {
      lastUpdated: serverTimestamp() as never,
    };

    // Track action-specific data
    switch (action) {
      case BadgeAction.DISTRICT_VISITED:
        if (data.districtId && !userData.districts?.includes(data.districtId)) {
          updates.districts = arrayUnion(data.districtId) as never;
          needsUpdate = true;
          await updateBadgeProgress(userId, 'explorer', userData.districts?.length || 0 + 1);
        }
        break;

      case BadgeAction.SESSION_ATTENDED:
        if (data.sessionId && !userData.sessionsAttended?.includes(data.sessionId)) {
          updates.sessionsAttended = arrayUnion(data.sessionId) as never;
          needsUpdate = true;
          await updateBadgeProgress(
            userId,
            'knowledge-seeker',
            userData.sessionsAttended?.length || 0 + 1
          );
        }
        break;

      case BadgeAction.PROFILE_VIEWED:
        if (data.profileUid && !userData.profilesViewed?.includes(data.profileUid)) {
          updates.profilesViewed = arrayUnion(data.profileUid) as never;
          needsUpdate = true;
          await updateBadgeProgress(
            userId,
            'connector',
            userData.profilesViewed?.length || 0 + 1
          );
        }
        break;

      case BadgeAction.SCAVENGER_HUNT_COMPLETED:
        if (data.scavengerHuntComplete && !userData.scavengerHuntCompleted) {
          updates.scavengerHuntCompleted = true;
          needsUpdate = true;
          await updateBadgeProgress(userId, 'pioneer', 1);
        }
        break;

      case BadgeAction.POINTS_EARNED:
        if (data.points) {
          updates.totalPoints = increment(data.points) as never;
          needsUpdate = true;
          const newPoints = (userData.totalPoints || 0) + data.points;
          await updateBadgeProgress(userId, 'champion', newPoints);
        }
        break;
    }

    if (needsUpdate) {
      await updateDoc(userRef, updates);
    }
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[achievements] Failed to check achievements:', e.code, e.message);
    throw error;
  }
}

/**
 * Update progress for a specific badge and unlock if requirement is met
 */
async function updateBadgeProgress(
  userId: string,
  badgeId: string,
  currentValue: number
): Promise<void> {
  const badge = getBadgeById(badgeId);
  if (!badge) {
    console.error(`[achievements] Badge not found: ${badgeId}`);
    return;
  }

  const userRef = doc(db, 'achievements', userId);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data() as UserAchievements;

  const badgeProgress = userData.badges.find((b) => b.badgeId === badgeId);
  if (!badgeProgress) {
    console.error(`[achievements] Badge progress not found: ${badgeId}`);
    return;
  }

  // Check if badge is already unlocked
  if (badgeProgress.unlockedAt) {
    return;
  }

  // Update current value
  const updatedBadges = userData.badges.map((b) => {
    if (b.badgeId === badgeId) {
      return {
        ...b,
        currentValue,
        lastUpdated: new Date(),
      };
    }
    return b;
  });

  await updateDoc(userRef, {
    badges: updatedBadges,
    lastUpdated: serverTimestamp(),
  });

  // Check if badge should be unlocked
  if (currentValue >= badge.requirement.targetValue) {
    await unlockBadge(userId, badgeId);
  }
}

/**
 * Unlock a badge for a user
 */
export async function unlockBadge(userId: string, badgeId: string): Promise<boolean> {
  try {
    const badge = getBadgeById(badgeId);
    if (!badge) {
      console.error(`[achievements] Badge not found: ${badgeId}`);
      return false;
    }

    const userRef = doc(db, 'achievements', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() as UserAchievements;

    const badgeProgress = userData.badges.find((b) => b.badgeId === badgeId);
    if (!badgeProgress) {
      console.error(`[achievements] Badge progress not found: ${badgeId}`);
      return false;
    }

    // Check if already unlocked
    if (badgeProgress.unlockedAt) {
      console.log(`[achievements] Badge already unlocked: ${badgeId}`);
      return false;
    }

    // Update badge progress with unlock timestamp
    const updatedBadges = userData.badges.map((b) => {
      if (b.badgeId === badgeId) {
        return {
          ...b,
          unlockedAt: new Date(),
          lastUpdated: new Date(),
        };
      }
      return b;
    });

    await updateDoc(userRef, {
      badges: updatedBadges,
      totalBadges: increment(1),
      lastUpdated: serverTimestamp(),
    });

    // Emit badge unlock event
    const unlockEvent: BadgeUnlockEvent = {
      badgeId,
      badge,
      userId,
      timestamp: Date.now(),
    };
    eventBus.emit('badge-unlocked', unlockEvent);

    console.log(`[achievements] Badge unlocked: ${badge.name}`);
    return true;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[achievements] Failed to unlock badge:', e.code, e.message);
    return false;
  }
}

/**
 * Get all badges with unlock status for a user
 */
export async function getUserBadges(userId: string): Promise<BadgeProgress[]> {
  try {
    await ensureUserAchievements(userId);

    const userRef = doc(db, 'achievements', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data() as UserAchievements;
    return userData.badges;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[achievements] Failed to get user badges:', e.code, e.message);
    return [];
  }
}

/**
 * Get complete badge progress including badge definitions
 */
export async function getBadgeProgress(userId: string): Promise<(BadgeProgress & { badge: Badge })[]> {
  try {
    const badgeProgress = await getUserBadges(userId);
    const allBadges = getAllBadges();

    return badgeProgress.map((progress) => {
      const badge = allBadges.find((b) => b.id === progress.badgeId);
      return {
        ...progress,
        badge: badge!,
      };
    }).filter((item) => item.badge !== undefined);
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[achievements] Failed to get badge progress:', e.code, e.message);
    return [];
  }
}

/**
 * Get user achievements data
 */
export async function getUserAchievements(userId: string): Promise<UserAchievements | null> {
  try {
    await ensureUserAchievements(userId);

    const userRef = doc(db, 'achievements', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data() as UserAchievements;
  } catch (error) {
    const e = error as FirestoreError;
    console.error('[achievements] Failed to get user achievements:', e.code, e.message);
    return null;
  }
}
