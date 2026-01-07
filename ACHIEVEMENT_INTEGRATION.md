# Achievement Badge System Integration Guide

This guide explains how to integrate the achievement badge system into the Beat Street application.

## Overview

The achievement system tracks user progress across 5 badges:
- **Explorer**: Visit all 5 districts
- **Knowledge Seeker**: Attend 5 sessions
- **Connector**: View 10 attendee profiles
- **Pioneer**: Complete scavenger hunt (limited to first 100)
- **Champion**: Earn 200+ points

## Architecture

### Files Created

1. **Types** (`src/types/achievements.ts`)
   - `Badge`: Badge definition with icon, category, requirements
   - `BadgeProgress`: User progress toward each badge
   - `UserAchievements`: Complete user achievement data
   - `BadgeUnlockEvent`: Event emitted when badge is unlocked

2. **Configuration** (`src/config/badges.ts`)
   - Badge definitions with requirements
   - Helper functions to get badges by ID, category, or rarity

3. **Service** (`src/services/achievements.ts`)
   - `checkAchievements(userId, action, data)`: Track user actions
   - `unlockBadge(userId, badgeId)`: Award a badge
   - `getUserBadges(userId)`: Get all user badges
   - `getBadgeProgress(userId)`: Get detailed progress

4. **Hook** (`src/hooks/useAchievements.ts`)
   - React hook that provides badge data, progress, and recent unlocks
   - Automatically listens for badge unlock events

5. **Components**
   - `BadgeDisplay.tsx`: Full badge showcase modal
   - `BadgeUnlockToast.tsx`: Toast notification on unlock
   - `SettingsPanel.tsx`: Updated with "My Badges" section

## Integration Steps

### 1. Add Achievement Tracking to App.tsx

```typescript
import { useState } from 'react';
import { useAchievements } from './hooks/useAchievements';
import { BadgeDisplay } from './components/BadgeDisplay';
import { BadgeUnlockToast } from './components/BadgeUnlockToast';
import { checkAchievements } from './services/achievements';
import { BadgeAction } from './types/achievements';

function App() {
  const [user, setUser] = useState(/* your user state */);
  const [showBadges, setShowBadges] = useState(false);

  // Initialize achievements hook
  const achievements = useAchievements(
    user ? { userId: user.uid, enabled: true } : null
  );

  return (
    <>
      {/* Your existing app components */}

      {/* Badge Display Modal */}
      <BadgeDisplay
        badges={achievements.badges}
        totalBadges={achievements.userAchievements?.totalBadges || 0}
        isOpen={showBadges}
        onClose={() => setShowBadges(false)}
      />

      {/* Badge Unlock Toast */}
      <BadgeUnlockToast unlockEvent={achievements.recentUnlock} />

      {/* Pass badge data to SettingsPanel */}
      <SettingsPanel
        /* ...other props */
        totalBadges={achievements.userAchievements?.totalBadges}
        onViewBadges={() => setShowBadges(true)}
      />
    </>
  );
}
```

### 2. Track District Visits

When a player enters a new zone/district:

```typescript
// In your Phaser scene or zone detection logic
eventBus.emit('zone-entered', { zone: 'downtown', districtId: 'district-1' });

// In App.tsx or a dedicated achievement tracker component
useEffect(() => {
  if (!user) return;

  const unsubscribe = eventBus.on('zone-entered', async (data: unknown) => {
    const { districtId } = data as { zone: string; districtId?: string };
    if (districtId) {
      await checkAchievements(user.uid, BadgeAction.DISTRICT_VISITED, {
        districtId,
      });
    }
  });

  return unsubscribe;
}, [user]);
```

### 3. Track Session Attendance

When a user interacts with a session POI:

```typescript
// In POIPanel.tsx or when user clicks "Attend Session"
eventBus.emit('session-attended', { sessionId: 'session-123' });

// In achievement tracker
useEffect(() => {
  if (!user) return;

  const unsubscribe = eventBus.on('session-attended', async (data: unknown) => {
    const { sessionId } = data as { sessionId: string };
    await checkAchievements(user.uid, BadgeAction.SESSION_ATTENDED, {
      sessionId,
    });
  });

  return unsubscribe;
}, [user]);
```

### 4. Track Profile Views

When a user views an attendee profile:

```typescript
// In AttendeeCard.tsx or presence viewer
eventBus.emit('profile-viewed', { uid: 'user-456' });

// In achievement tracker
useEffect(() => {
  if (!user) return;

  const unsubscribe = eventBus.on('profile-viewed', async (data: unknown) => {
    const { uid } = data as { uid: string };
    await checkAchievements(user.uid, BadgeAction.PROFILE_VIEWED, {
      profileUid: uid,
    });
  });

  return unsubscribe;
}, [user]);
```

### 5. Track Points

When points are awarded (e.g., completing tasks, scanning QR codes):

```typescript
// Wherever points are awarded
eventBus.emit('points-earned', { points: 50 });

// In achievement tracker
useEffect(() => {
  if (!user) return;

  const unsubscribe = eventBus.on('points-earned', async (data: unknown) => {
    const { points } = data as { points: number };
    await checkAchievements(user.uid, BadgeAction.POINTS_EARNED, {
      points,
    });
  });

  return unsubscribe;
}, [user]);
```

### 6. Track Scavenger Hunt Completion

When the scavenger hunt is completed:

```typescript
// In scavenger hunt service
eventBus.emit('scavenger-hunt-completed', {});

// In achievement tracker
useEffect(() => {
  if (!user) return;

  const unsubscribe = eventBus.on('scavenger-hunt-completed', async () => {
    await checkAchievements(user.uid, BadgeAction.SCAVENGER_HUNT_COMPLETED, {
      scavengerHuntComplete: true,
    });
  });

  return unsubscribe;
}, [user]);
```

## Centralized Achievement Tracker Component

For cleaner code, create a dedicated achievement tracker component:

```typescript
// src/components/AchievementTracker.tsx
import { useEffect } from 'react';
import { eventBus } from '../lib/EventBus';
import { checkAchievements } from '../services/achievements';
import { BadgeAction } from '../types/achievements';

interface AchievementTrackerProps {
  userId: string;
}

export function AchievementTracker({ userId }: AchievementTrackerProps) {
  useEffect(() => {
    // Track district visits
    const unsubDistrict = eventBus.on('zone-entered', async (data: unknown) => {
      const { districtId } = data as { zone: string; districtId?: string };
      if (districtId) {
        await checkAchievements(userId, BadgeAction.DISTRICT_VISITED, {
          districtId,
        });
      }
    });

    // Track session attendance
    const unsubSession = eventBus.on('session-attended', async (data: unknown) => {
      const { sessionId } = data as { sessionId: string };
      await checkAchievements(userId, BadgeAction.SESSION_ATTENDED, {
        sessionId,
      });
    });

    // Track profile views
    const unsubProfile = eventBus.on('profile-viewed', async (data: unknown) => {
      const { uid } = data as { uid: string };
      await checkAchievements(userId, BadgeAction.PROFILE_VIEWED, {
        profileUid: uid,
      });
    });

    // Track points
    const unsubPoints = eventBus.on('points-earned', async (data: unknown) => {
      const { points } = data as { points: number };
      await checkAchievements(userId, BadgeAction.POINTS_EARNED, {
        points,
      });
    });

    // Track scavenger hunt
    const unsubScavenger = eventBus.on('scavenger-hunt-completed', async () => {
      await checkAchievements(userId, BadgeAction.SCAVENGER_HUNT_COMPLETED, {
        scavengerHuntComplete: true,
      });
    });

    return () => {
      unsubDistrict();
      unsubSession();
      unsubProfile();
      unsubPoints();
      unsubScavenger();
    };
  }, [userId]);

  return null; // This component doesn't render anything
}
```

Then use it in App.tsx:

```typescript
{user && <AchievementTracker userId={user.uid} />}
```

## Firestore Structure

The system stores achievement data in Firestore:

```
achievements/{userId}
  - userId: string
  - badges: BadgeProgress[]
    - badgeId: string
    - currentValue: number
    - targetValue: number
    - unlockedAt?: Timestamp
    - lastUpdated: Timestamp
  - totalBadges: number
  - totalPoints: number
  - districts: string[]
  - sessionsAttended: string[]
  - profilesViewed: string[]
  - scavengerHuntCompleted: boolean
  - lastUpdated: Timestamp
```

## Firestore Rules

The Firestore rules are already configured in `firestore.rules`:

```
match /achievements/{uid} {
  allow read: if isAuthenticated();
  allow create: if isOwner(uid) || isAdmin();
  allow update: if isOwner(uid) || isAdmin();
  allow delete: if isAdmin();
}
```

## Testing

To test the achievement system:

1. **Emit test events** via browser console (dev mode only):
```javascript
window.__eventBus.emit('zone-entered', { zone: 'test', districtId: 'district-1' });
window.__eventBus.emit('session-attended', { sessionId: 'session-123' });
window.__eventBus.emit('profile-viewed', { uid: 'user-456' });
window.__eventBus.emit('points-earned', { points: 50 });
```

2. **Check Firestore** for updated achievement data
3. **Watch for toast notifications** when badges are unlocked
4. **Open badge display** via Settings panel

## Notes

- Badge progress is automatically tracked in Firestore
- The system prevents duplicate tracking (e.g., visiting same district twice)
- Badge unlocks trigger EventBus events for toast notifications
- All badge data is cached in the React hook for performance
- The first 100 users to complete the scavenger hunt get the Pioneer badge (implement counter in Cloud Functions if needed)
