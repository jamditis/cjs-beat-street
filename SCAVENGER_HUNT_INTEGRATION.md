# Scavenger Hunt Integration Guide

Quick reference for integrating the scavenger hunt system into Beat Street.

## Quick Start

### 1. Import Components and Hooks

```typescript
import { ScavengerHuntPanel } from './components/ScavengerHuntPanel';
import { useScavengerHunt } from './hooks/useScavengerHunt';
import { HuntItemMarker, createHuntItemMarkers } from './components/HuntItemMarker';
import { VenueId } from './types/venue';
```

### 2. Add to Main App Component

```typescript
function App() {
  const [showHuntPanel, setShowHuntPanel] = useState(false);
  const user = useAuth(); // Your auth hook
  const venueId = VenueId.CHAPEL_HILL;

  return (
    <>
      {/* Your existing UI */}

      {/* Hunt Panel Toggle Button */}
      <button
        onClick={() => setShowHuntPanel(true)}
        className="fixed bottom-20 right-4 bg-teal-600 text-white p-4 rounded-full shadow-lg"
        aria-label="Open scavenger hunt"
      >
        <Trophy className="w-6 h-6" />
      </button>

      {/* Scavenger Hunt Panel */}
      {user && (
        <ScavengerHuntPanel
          userId={user.uid}
          venueId={venueId}
          displayName={user.displayName}
          playerPosition={playerPosition} // From game state
          isOpen={showHuntPanel}
          onClose={() => setShowHuntPanel(false)}
        />
      )}
    </>
  );
}
```

### 3. Add Hunt Markers to Phaser Scene

```typescript
import { createHuntItemMarkers } from '../components/HuntItemMarker';
import { eventBus } from '../lib/EventBus';

class CityMapScene extends Phaser.Scene {
  private huntMarkers?: Map<string, HuntItemMarker>;

  async create() {
    // Load hunt items
    const huntItems = await getHuntItems(VenueId.CHAPEL_HILL);
    const progress = await getProgress(userId, VenueId.CHAPEL_HILL);
    const completedIds = new Set(progress?.completedItems.map(c => c.itemId) || []);

    // Create markers
    this.huntMarkers = createHuntItemMarkers(
      this,
      huntItems,
      completedIds,
      (item) => {
        // Show item details in UI
        eventBus.emit('hunt-item-selected', { item });
      }
    );

    // Listen for collection events to update markers
    eventBus.on('hunt-item-collected', (data: any) => {
      const marker = this.huntMarkers?.get(data.itemId);
      marker?.setCompleted(true);
    });
  }
}
```

### 4. Deploy Hunt Items to Firestore

```bash
# Set up Firebase credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"

# Run seed script
npx tsx scripts/seed-hunt-items.ts
```

### 5. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## UI Integration Options

### Option A: Floating Action Button

```typescript
<button
  onClick={() => setShowHuntPanel(true)}
  className="fixed bottom-20 right-4 bg-teal-600 text-white p-4 rounded-full shadow-lg hover:bg-teal-700 transition-colors"
>
  <Trophy className="w-6 h-6" />
  {stats && (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
      {stats.completedItems}/{stats.totalItems}
    </span>
  )}
</button>
```

### Option B: Menu Item

```typescript
<nav>
  <a onClick={() => setShowHuntPanel(true)}>
    <Trophy className="w-5 h-5" />
    Scavenger Hunt
  </a>
</nav>
```

### Option C: Settings Panel Integration

Add to existing settings panel:

```typescript
<SettingsPanel>
  {/* Existing settings */}

  <button onClick={() => setShowHuntPanel(true)}>
    <Trophy /> Scavenger Hunt ({stats?.completedItems}/{stats?.totalItems})
  </button>
</SettingsPanel>
```

## Event Handling

### Listen for Hunt Events

```typescript
import { useHuntEvent } from './hooks/useScavengerHunt';

function MyComponent() {
  useHuntEvent('hunt-item-collected', (data) => {
    const event = data as { itemId: string; item: HuntItem; progress: HuntProgress };

    // Show toast notification
    toast.success(`Collected: ${event.item.name} (+${event.item.points} points)`);

    // Play sound
    playSound('collect');

    // Update UI
    // ...
  });

  return <div>...</div>;
}
```

### Emit Hunt Events from Game

```typescript
// When player enters proximity of hunt item
eventBus.emit('hunt-item-proximity', {
  itemId: item.id,
  item,
  distance: 50
});

// When player selects hunt item
eventBus.emit('hunt-item-selected', {
  itemId: item.id,
  item
});
```

## Customization

### Custom Hunt Items

Edit `/home/user/cjs-beat-street/scripts/data/hunt-items.json`:

```json
[
  {
    "name": "Custom Item",
    "description": "Your description",
    "type": "sponsor",
    "points": 10,
    "location": {
      "x": 500,
      "y": 400,
      "floor": 1,
      "zone": "exhibit-hall",
      "venueId": "chapel-hill",
      "mapId": "convention-center"
    },
    "venueId": "chapel-hill",
    "metadata": {
      "company": "Company Name",
      "hint": "Look near the entrance"
    },
    "isActive": true
  }
]
```

### Custom Points Values

Edit `/home/user/cjs-beat-street/src/types/gamification.ts`:

```typescript
export const HUNT_POINTS = {
  [HuntItemType.SPONSOR]: 20,      // Changed from 10
  [HuntItemType.SESSION]: 30,      // Changed from 15
  [HuntItemType.LANDMARK]: 10,     // Changed from 5
  COMPLETION_BONUS: 100,           // Changed from 50
} as const;
```

### Custom Marker Styles

Edit marker colors in `/home/user/cjs-beat-street/src/components/HuntItemMarker.tsx`:

```typescript
private getMarkerColor(): number {
  switch (this.item.type) {
    case HuntItemType.SPONSOR:
      return 0xff0000; // Red instead of blue
    case HuntItemType.SESSION:
      return 0x00ff00; // Green instead of purple
    case HuntItemType.LANDMARK:
      return 0x0000ff; // Blue instead of amber
    default:
      return 0x2a9d8f;
  }
}
```

## Performance Tips

1. **Lazy Load Hunt Panel**: Only mount when opened
2. **Memoize Hunt Items**: Use `useMemo` for filtered lists
3. **Debounce Proximity Checks**: Don't check on every frame
4. **Paginate Leaderboard**: Load only top 20 initially
5. **Cache Hunt Items**: Use offline persistence

```typescript
// Example: Lazy load panel
const LazyHuntPanel = lazy(() => import('./components/ScavengerHuntPanel'));

{showHuntPanel && (
  <Suspense fallback={<LoadingSpinner />}>
    <LazyHuntPanel {...props} />
  </Suspense>
)}
```

## Troubleshooting

### Hunt items not loading

1. Check Firestore rules are deployed
2. Verify user is authenticated
3. Check browser console for errors
4. Verify hunt items exist in Firestore

### Check-ins not working

1. Verify userId matches authenticated user
2. Check Firestore rules allow write
3. Ensure item hasn't already been collected
4. Check network connectivity

### Markers not appearing

1. Verify hunt items loaded
2. Check marker depth/z-index
3. Verify scene is active
4. Check marker positions are within camera bounds

### Leaderboard empty

1. Verify at least one user has progress
2. Check query indexes are deployed
3. Verify venueId matches
4. Check Firestore rules allow read

## Testing

### Manual Testing

1. Open scavenger hunt panel
2. Verify all 20 items appear
3. Filter by type (sponsors, sessions, landmarks)
4. Click "Check In" on an item
5. Verify points awarded
6. Verify item marked as collected
7. Check leaderboard updates
8. Collect all items to test completion bonus

### Automated Testing (Example)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useScavengerHunt } from '../hooks/useScavengerHunt';

test('should collect hunt item', async () => {
  const { result } = renderHook(() =>
    useScavengerHunt({
      userId: 'test-user',
      venueId: VenueId.CHAPEL_HILL,
    })
  );

  await waitFor(() => {
    expect(result.current.huntItems.length).toBeGreaterThan(0);
  });

  const itemId = result.current.huntItems[0].id;

  await result.current.checkIn(itemId);

  await waitFor(() => {
    expect(result.current.isItemCompleted(itemId)).toBe(true);
  });
});
```

## Analytics Integration

Track hunt events for analytics:

```typescript
useHuntEvent('hunt-item-collected', (data) => {
  const event = data as { itemId: string; item: HuntItem };

  // Google Analytics
  gtag('event', 'hunt_item_collected', {
    item_id: event.itemId,
    item_type: event.item.type,
    points: event.item.points,
  });

  // Mixpanel
  mixpanel.track('Hunt Item Collected', {
    itemId: event.itemId,
    itemType: event.item.type,
    points: event.item.points,
  });
});
```

## Security Considerations

1. **Rate Limiting**: Prevent spam check-ins (implement in Cloud Functions)
2. **Location Validation**: Verify user is near item location
3. **Duplicate Prevention**: System already prevents duplicate check-ins
4. **Admin-Only Item Creation**: Only admins can create/modify items
5. **User Progress Isolation**: Users can only modify their own progress

## Support

For detailed documentation, see:
- `/home/user/cjs-beat-street/SCAVENGER_HUNT_SYSTEM.md`
- `/home/user/cjs-beat-street/src/types/gamification.ts`
- `/home/user/cjs-beat-street/src/services/scavenger.ts`
