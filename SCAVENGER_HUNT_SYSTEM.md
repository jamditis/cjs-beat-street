# Scavenger Hunt Gamification System

Complete implementation of the scavenger hunt gamification system for Beat Street CJS Navigator.

## Overview

The scavenger hunt system allows conference attendees to collect items by visiting sponsor booths, attending sessions, and discovering landmarks throughout the venue. Players earn points for each item collected and compete on a leaderboard.

## Points System

- **Sponsor booth check-in**: 10 points
- **Session attendance**: 15 points
- **Landmark discovery**: 5 points
- **Completion bonus**: 50 points (awarded when all items are collected)

**Total possible points**: 270 points
- Base points: 220 (10 sponsors × 10 + 8 sessions × 15 + 2 landmarks × 5)
- Completion bonus: 50

## Files Created

### 1. Type Definitions

**File**: `/home/user/cjs-beat-street/src/types/gamification.ts`

Defines all TypeScript types for the scavenger hunt system:

- `HuntItem` - Hunt item definition with location, type, points
- `HuntProgress` - User's hunt progress tracking
- `CheckIn` - Individual check-in record
- `LeaderboardEntry` - Leaderboard entry with rank and stats
- `HuntStats` - Statistics calculation helpers
- `HuntItemType` - Enum for item types (sponsor, session, landmark)
- `CheckInMethod` - Enum for check-in methods (qr, tap, proximity)

### 2. Service Layer

**File**: `/home/user/cjs-beat-street/src/services/scavenger.ts`

Firebase service for scavenger hunt operations:

- `getHuntItems(venueId)` - Fetch all hunt items for a venue
- `getHuntItem(itemId)` - Get a single hunt item
- `getProgress(userId, venueId)` - Get user's hunt progress
- `isCompleted(userId, itemId, venueId)` - Check if item already collected
- `checkIn(userId, itemId, venueId, method, location)` - Record check-in and award points
- `getLeaderboard(venueId, limit)` - Get top hunters by points
- `getHuntStats(userId, venueId)` - Calculate hunt statistics
- `getNearbyHuntItems(items, position, radius)` - Find nearby items
- `createHuntItems(items)` - Batch create hunt items (for seeding)
- `updateProgressDisplayName(userId, venueId, displayName)` - Update display name for leaderboard

### 3. React Hook

**File**: `/home/user/cjs-beat-street/src/hooks/useScavengerHunt.ts`

Custom React hook for hunt functionality:

**State:**
- `huntItems` - List of all hunt items
- `progress` - User's current progress
- `leaderboard` - Top 20 hunters
- `nearbyItems` - Items within proximity threshold
- `stats` - Hunt statistics
- `isLoading` - Loading state
- `error` - Error state

**Actions:**
- `checkIn(itemId, method)` - Trigger a check-in
- `refreshProgress()` - Refresh user progress
- `refreshLeaderboard()` - Refresh leaderboard
- `refreshHuntItems()` - Refresh hunt items

**Helpers:**
- `isItemCompleted(itemId)` - Check completion status
- `getItemById(itemId)` - Get item by ID
- `filterItemsByType(type)` - Filter items by type

### 4. UI Components

#### ScavengerHuntPanel

**File**: `/home/user/cjs-beat-street/src/components/ScavengerHuntPanel.tsx`

Main UI panel component with:

- **Progress Bar**: Visual progress indicator with percentage and points
- **View Modes**: Toggle between "Hunt Items" and "Leaderboard"
- **Filter Buttons**: Filter items by type (All, Sponsors, Sessions, Landmarks)
- **Hunt Items List**: Shows all items with:
  - Completion status (checkmark for collected)
  - Type icon and color coding
  - Points display
  - "Nearby" badge for items in proximity
  - Check-in button
  - Hints for uncollected items
- **Leaderboard View**: Shows top 20 hunters with:
  - Rank (medals for top 3)
  - Display name
  - Items collected count
  - Total points
  - Highlight for current user
- **Celebration Animation**: Full-screen celebration when hunt is completed

#### HuntItemMarker

**File**: `/home/user/cjs-beat-street/src/components/HuntItemMarker.tsx`

Phaser game marker component for rendering hunt items on the map:

- **Different Shapes by Type**:
  - Sponsors: Square
  - Sessions: Triangle
  - Landmarks: Star
- **Pulsing Animation**: Uncollected items pulse to attract attention
- **Checkmark Overlay**: Collected items show a checkmark
- **Interactive**: Click to check in, hover to show label
- **Color Coded**: Blue (sponsors), Purple (sessions), Amber (landmarks)

Utility function:
- `createHuntItemMarkers(scene, items, completedIds, onClick, onHover, onHoverEnd)` - Batch create markers

### 5. Data Files

#### Hunt Items Data

**File**: `/home/user/cjs-beat-street/scripts/data/hunt-items.json`

Contains 20 hunt items:
- **10 sponsor booths**: Vercel, Netlify, GitHub, Cloudflare, AWS, Supabase, Stripe, Sentry, Prisma, Tailwind CSS
- **8 sessions**: Opening Keynote, Modern React Patterns, TypeScript Deep Dive, Web Performance, GraphQL, Serverless, Web3, Accessibility
- **2 landmarks**: Welcome Desk, Conference Fountain

Each item includes:
- Name and description
- Type and points
- Location (x, y coordinates, floor, zone, venue)
- Metadata (company/speaker/room info, hints)

#### Seed Script

**File**: `/home/user/cjs-beat-street/scripts/seed-hunt-items.ts`

TypeScript script to seed hunt items to Firestore:

**Usage:**
```bash
npx tsx scripts/seed-hunt-items.ts
```

**Requirements:**
- Firebase Admin SDK credentials
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable OR
- Place `service-account-key.json` in project root

**Features:**
- Loads items from JSON
- Batch writes to Firestore
- Progress logging
- Summary statistics by type
- Error handling

### 6. Firestore Security Rules

**File**: `/home/user/cjs-beat-street/firestore.rules` (updated)

Added rules for two new collections:

```javascript
// Hunt items collection
match /hunt_items/{itemId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// Hunt progress collection
match /hunt_progress/{progressId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() &&
                   request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid &&
                   request.resource.data.userId == request.auth.uid;
  allow delete: if isAdmin();
}
```

### 7. Event Bus Integration

**File**: `/home/user/cjs-beat-street/src/lib/EventBus.ts` (updated)

Added new event type:

```typescript
'hunt-item-collected': {
  itemId: string;
  item: unknown;
  method: string;
  progress: unknown;
}
```

This event is emitted when a user successfully checks in at a hunt item, allowing other parts of the application to react (e.g., show notifications, update UI, play sounds).

## Firestore Collections

### hunt_items

```javascript
{
  id: string (auto-generated),
  name: string,
  description: string,
  type: 'sponsor' | 'session' | 'landmark',
  points: number,
  location: {
    x: number,
    y: number,
    floor?: number,
    zone?: string,
    venueId: string,
    mapId?: string
  },
  venueId: string,
  poiId?: string,
  metadata?: {
    company?: string,
    speaker?: string,
    room?: string,
    photoOpportunity?: boolean,
    hint?: string
  },
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### hunt_progress

```javascript
{
  id: string (format: "{userId}_{venueId}"),
  userId: string,
  venueId: string,
  displayName: string,
  completedItems: [
    {
      itemId: string,
      timestamp: timestamp,
      method: 'qr' | 'tap' | 'proximity',
      location?: {
        x: number,
        y: number,
        zone: string
      }
    }
  ],
  totalPoints: number,
  completedAt?: timestamp,
  startedAt: timestamp,
  lastCheckInAt: timestamp
}
```

## Firestore Indexes Required

Add these composite indexes in Firebase Console or `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "hunt_items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "venueId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "hunt_progress",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "venueId", "order": "ASCENDING" },
        { "fieldPath": "totalPoints", "order": "DESCENDING" },
        { "fieldPath": "lastCheckInAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Usage Example

### In a React Component

```typescript
import { useScavengerHunt } from '../hooks/useScavengerHunt';
import { ScavengerHuntPanel } from '../components/ScavengerHuntPanel';
import { VenueId } from '../types/venue';

function MyComponent() {
  const [showHuntPanel, setShowHuntPanel] = useState(false);
  const userId = 'user123';
  const venueId = VenueId.CHAPEL_HILL;

  const {
    huntItems,
    stats,
    nearbyItems,
    checkIn
  } = useScavengerHunt({
    userId,
    venueId,
    displayName: 'John Doe',
    playerPosition: { x: 500, y: 400 },
    autoCheckInEnabled: false
  });

  return (
    <>
      <button onClick={() => setShowHuntPanel(true)}>
        Scavenger Hunt ({stats?.completedItems}/{stats?.totalItems})
      </button>

      <ScavengerHuntPanel
        userId={userId}
        venueId={venueId}
        displayName="John Doe"
        playerPosition={{ x: 500, y: 400 }}
        isOpen={showHuntPanel}
        onClose={() => setShowHuntPanel(false)}
      />
    </>
  );
}
```

### In a Phaser Scene

```typescript
import { createHuntItemMarkers } from '../components/HuntItemMarker';
import { eventBus } from '../lib/EventBus';

class GameScene extends Phaser.Scene {
  private huntMarkers: Map<string, HuntItemMarker>;

  create() {
    // Create hunt item markers
    this.huntMarkers = createHuntItemMarkers(
      this,
      huntItems,
      completedItemIds,
      (item) => {
        // Handle click - emit event for React to handle
        eventBus.emit('hunt-item-selected', { item });
      },
      (item) => {
        // Handle hover
        eventBus.emit('hunt-item-hover', { item });
      },
      () => {
        // Handle hover end
        eventBus.emit('hunt-item-hover-end', {});
      }
    );

    // Listen for hunt item collection
    eventBus.on('hunt-item-collected', (data) => {
      const marker = this.huntMarkers.get(data.itemId);
      if (marker) {
        marker.setCompleted(true);
      }
    });
  }
}
```

## Deployment Steps

1. **Deploy Firestore Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Deploy Firestore Indexes** (if using firestore.indexes.json):
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **Seed Hunt Items**:
   ```bash
   # Set Firebase credentials
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

   # Run seed script
   npx tsx scripts/seed-hunt-items.ts
   ```

4. **Deploy Application**:
   ```bash
   npm run build
   # Deploy to hosting (Vercel, Netlify, etc.)
   ```

## Testing Checklist

- [ ] Hunt items load from Firestore
- [ ] Can view all hunt items in panel
- [ ] Can filter items by type
- [ ] Check-in button works and awards points
- [ ] Progress bar updates correctly
- [ ] Leaderboard displays top hunters
- [ ] Hunt markers appear on game map
- [ ] Markers pulse for uncollected items
- [ ] Markers show checkmark for collected items
- [ ] Nearby items show "Nearby" badge
- [ ] Completion bonus awarded when all items collected
- [ ] Celebration animation shows on completion
- [ ] `hunt-item-collected` event fires correctly

## Future Enhancements

1. **QR Code Check-ins**: Add QR code scanning for sponsor booths
2. **Proximity Auto Check-in**: Enable automatic check-in when very close to an item
3. **Daily/Weekly Challenges**: Add time-limited hunt challenges
4. **Achievements**: Award badges for hunt milestones
5. **Social Sharing**: Allow users to share their hunt progress
6. **Teams**: Add team-based scavenger hunts
7. **Hints System**: Provide progressive hints for difficult items
8. **Photo Verification**: Require photo upload at landmarks
9. **Timed Hunts**: Add countdown timer for competitive hunts
10. **Multi-Venue Support**: Expand to support multiple conference venues

## Notes

- The system is designed to work offline-first with Firestore persistence
- Hunt progress is stored per user per venue (supports multi-venue conferences)
- Leaderboard is venue-specific
- All check-ins are timestamped for potential future analytics
- The system integrates seamlessly with the existing EventBus architecture
- Proximity threshold is configurable (default: 100 pixels)

## Support

For issues or questions about the scavenger hunt system, refer to:
- Main documentation: `/home/user/cjs-beat-street/CLAUDE.md`
- Type definitions: `/home/user/cjs-beat-street/src/types/gamification.ts`
- Service implementation: `/home/user/cjs-beat-street/src/services/scavenger.ts`
