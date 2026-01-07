# Presence Visualization System - Integration Guide

This guide explains how to integrate the presence visualization system into Beat Street scenes.

## Files Created

### 1. `/src/game/entities/AttendeeMarker.ts`
Visual representation of attendees with:
- Avatar circle with initials or photo
- Status indicator (active/idle/away)
- Smooth position interpolation
- Fade in/out animations
- Hover effects with name label
- Click handler for profile viewing

### 2. `/src/game/systems/PresenceManager.ts`
System to manage all attendee markers with:
- Subscribe to presence updates from EventBus
- Create/update/remove AttendeeMarkers automatically
- Zone-based filtering
- Clustering for nearby attendees (shows "+3" badge)
- Performance optimization (max 50 visible markers)
- Methods: `showAttendees()`, `hideAttendees()`, `focusOnAttendee(uid)`

### 3. `/src/components/AttendeeCard.tsx`
React component for attendee details with:
- Avatar/initials display
- Name, organization, zone
- Status badge
- "Send Wave" button with animation
- "Find on Map" button to focus camera
- Privacy-conscious footer text

### 4. `/src/hooks/useAttendees.ts`
React hook providing:
- `nearbyAttendees` - List of nearby users
- `selectedAttendee` - Currently selected attendee
- `selectAttendee(uid)` - Select an attendee
- `waveAt(uid)` - Send a wave greeting
- `findOnMap(uid)` - Focus camera on attendee
- `getAttendeesByZone()` - Group attendees by zone
- `getStatusCounts()` - Get counts by status

### 5. `/src/components/PresenceList.tsx` (Updated)
Enhanced with:
- Avatar circles with initials
- Status indicators on avatars
- Quick action buttons (Wave, Find on Map)
- Group by zone toggle
- Click to view full attendee card
- Improved styling and animations

### 6. `/src/lib/EventBus.ts` (Updated)
Added new event types:
- `attendee-selected` - When attendee is clicked
- `send-wave` - Send greeting to attendee
- `focus-attendee` - Request camera focus on attendee
- `attendee-focused` - Confirmation of camera focus
- `toggle-attendee-markers` - Show/hide markers
- `cluster-expanded` - When cluster is expanded

## Integration into Phaser Scenes

### Step 1: Import PresenceManager

```typescript
import { PresenceManager } from '../systems/PresenceManager';
```

### Step 2: Add to Scene Class

```typescript
export class CityMapScene extends Phaser.Scene {
  private player!: Player;
  private presenceManager!: PresenceManager;

  // ... other properties
}
```

### Step 3: Initialize in create() Method

```typescript
create(): void {
  // ... existing setup code

  // Initialize presence manager
  this.presenceManager = new PresenceManager({
    scene: this,
    maxVisibleMarkers: 50,
    clusterDistance: 80,
    enabled: true,
  });

  // ... rest of create code
}
```

### Step 4: Update in update() Method

```typescript
update(time: number, delta: number): void {
  // ... existing update code

  // Update presence manager
  this.presenceManager.update(time);

  // ... rest of update code
}
```

### Step 5: Cleanup in shutdown() Method

```typescript
shutdown(): void {
  // ... existing cleanup

  if (this.presenceManager) {
    this.presenceManager.destroy();
  }
}
```

## Integration into React App

### Step 1: Import AttendeeCard Component

In your main GameContainer or App component:

```typescript
import { AttendeeCard } from './components/AttendeeCard';
```

### Step 2: Add to JSX

```tsx
<div className="relative w-full h-full">
  {/* Game Canvas */}
  <GameContainer />

  {/* UI Overlays */}
  <PresenceList />
  <AttendeeCard />
  <POIPanel />

  {/* Other UI components */}
</div>
```

### Step 3: Use the Hook (Optional)

For custom UI that needs attendee data:

```typescript
import { useAttendees } from './hooks/useAttendees';

function CustomComponent() {
  const {
    nearbyAttendees,
    selectedAttendee,
    waveAt,
    findOnMap,
    getAttendeesByZone,
  } = useAttendees({ autoFetch: true });

  // Use the data and methods as needed
}
```

## Event Flow

### Viewing an Attendee Profile

1. User clicks AttendeeMarker in game OR clicks user in PresenceList
2. EventBus emits `attendee-selected` with `{ uid }`
3. AttendeeCard component listens and displays the card
4. User can wave or find on map from the card

### Finding an Attendee on Map

1. User clicks "Find on Map" in PresenceList or AttendeeCard
2. EventBus emits `focus-attendee` with `{ uid }`
3. PresenceManager listens and animates camera to attendee
4. Attendee's name label is temporarily shown
5. EventBus emits `attendee-focused` as confirmation

### Sending a Wave

1. User clicks wave button
2. EventBus emits `send-wave` with `{ toUid, timestamp }`
3. Backend Cloud Function processes the wave (to be implemented)
4. Target user receives notification (to be implemented)

## Customization Options

### AttendeeMarker

```typescript
// Customize appearance in AttendeeMarker.ts
private readonly avatarRadius = 20; // Change size
private readonly statusIndicatorSize = 6; // Change status dot size
```

### PresenceManager

```typescript
// When initializing
new PresenceManager({
  maxVisibleMarkers: 100, // Show more markers
  clusterDistance: 60,    // Cluster more aggressively
  enabled: false,         // Start hidden
});
```

### Clustering Behavior

By default, 3+ attendees within 80px are clustered. Adjust in PresenceManager:

```typescript
private clusterDistance = 80; // Change to 60, 100, etc.

// In createClusterLabel, change minimum cluster size:
if (cluster.attendees.length >= 3) { // Change to 2, 4, etc.
```

## Performance Notes

- **Marker Limit**: Default 50 visible markers. Increase cautiously.
- **Update Throttling**: PresenceManager updates every 1000ms (1 second)
- **Position Interpolation**: Smooth movement with 0.1 lerp factor
- **LOD**: Future enhancement - reduce detail for distant markers

## Testing

### Mock Presence Data

Add test data to see markers in action:

```typescript
// In your scene's create() method
eventBus.emit('presence-update', {
  users: [
    {
      uid: 'user1',
      displayName: 'John Doe',
      zone: 'Downtown',
      status: 'active',
    },
    {
      uid: 'user2',
      displayName: 'Jane Smith',
      zone: 'Downtown',
      status: 'idle',
    },
    // Add more test users
  ],
});
```

### Toggle Visibility

```typescript
// Show/hide markers programmatically
eventBus.emit('toggle-attendee-markers', { visible: false });
```

## Future Enhancements

1. **Real-time Position Updates**: Sync actual attendee positions from Firebase
2. **Photo Loading**: Implement proper avatar photo loading
3. **Wave Notifications**: Backend Cloud Function for wave delivery
4. **Custom Status Messages**: "At coffee booth", "In session X", etc.
5. **Friend System**: Highlight friends with different marker style
6. **Privacy Zones**: Some areas may disable presence visibility
7. **Animations**: Walking animations when attendees move
8. **Sound Effects**: Subtle sound when someone nearby appears/waves

## Troubleshooting

### Markers not appearing

1. Check EventBus for `presence-update` events
2. Verify PresenceManager is initialized and enabled
3. Check `maxVisibleMarkers` limit
4. Ensure users have `shareLocation: true`

### Performance issues

1. Reduce `maxVisibleMarkers`
2. Increase `updateInterval` in PresenceManager
3. Increase `clusterDistance` to cluster more aggressively
4. Check browser DevTools Performance tab

### Clicks not working

1. Verify markers have interactive flag set
2. Check z-index/depth ordering
3. Ensure onClick handler is passed to AttendeeMarker config
4. Check browser console for errors

## API Reference

### PresenceManager Methods

```typescript
showAttendees(): void              // Make all markers visible
hideAttendees(): void              // Hide all markers
setVisible(visible: boolean): void // Toggle visibility
focusOnAttendee(uid: string): void // Camera pan to attendee
update(time: number): void         // Call in scene update loop
destroy(): void                    // Cleanup (call in shutdown)
getMarkerCount(): number           // Get current marker count
hasMarker(uid: string): boolean    // Check if marker exists
```

### AttendeeMarker Methods

```typescript
setPosition(x: number, y: number): void           // Set target position
updateStatus(status): void                        // Change status indicator
fadeOut(callback?: () => void): void             // Fade out with callback
destroy(): void                                  // Remove marker
getPosition(): { x: number; y: number }          // Get position
setVisible(visible: boolean): void               // Show/hide
setNameLabelVisible(visible: boolean): void      // Show/hide name
```

## Questions?

See the main CLAUDE.md for general project patterns and architecture.
