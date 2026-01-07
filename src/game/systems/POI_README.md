# POI (Point of Interest) Management System

A comprehensive system for managing interactive points of interest in Beat Street.

## Overview

The POI system consists of:
- **Type definitions** (`src/types/poi.ts`) - TypeScript interfaces and enums
- **POI Entity** (`src/game/entities/POI.ts`) - Individual POI visual representation
- **POI Manager** (`src/game/systems/POIManager.ts`) - System to manage multiple POIs
- **React Hook** (`src/hooks/usePOI.ts`) - React integration for POI state
- **Enhanced UI** (`src/components/POIPanel.tsx`) - Rich POI details panel

## Features

### POI Types
- `SESSION` - Conference sessions with speaker, time, track info
- `SPONSOR` - Sponsor booths with logo and company details
- `FOOD` - Food stations with menu and dietary options
- `SOCIAL` - Social areas with capacity info
- `INFO` - Information desks
- `LANDMARK` - Notable locations

### Visual Features
- Hover effects (scale, glow)
- Click interactions
- Pulse animations for important POIs
- Type-specific icons
- Labels with names
- Optional distance indicators
- Active/inactive states

### POI Manager Capabilities
- Register/unregister POIs dynamically
- Query by type, floor, zone, proximity
- Advanced filtering with multiple criteria
- Load from Tiled map object layers
- Load from Firestore (placeholder for future)
- Proximity-based events
- Highlight/unhighlight controls
- Statistics tracking

### React Integration
- `usePOI()` hook provides:
  - Selected POI state
  - Hovered POI state
  - Nearby POIs list
  - Query functions (by type, floor, zone)
  - Interaction tracking
  - Statistics

### Events Emitted
- `poi-selected` - POI clicked
- `poi-hover-start` - Mouse enters POI
- `poi-hover-end` - Mouse leaves POI
- `poi-proximity` - Player near POI
- `poi-interaction` - Any POI interaction
- `navigate-to-poi` - Navigation requested

## Quick Start

### 1. Setup in a Phaser Scene

```typescript
import { POIManager } from '../systems/POIManager';
import { POIType } from '../../types/poi';

class MyScene extends Phaser.Scene {
  private poiManager!: POIManager;

  create(): void {
    // Initialize POI Manager
    this.poiManager = new POIManager({
      scene: this,
      showLabels: true,
      showDistances: true,
    });

    // Register a POI
    this.poiManager.registerPOI({
      id: 'keynote-main',
      type: POIType.SESSION,
      name: 'Opening Keynote',
      description: 'Join us for the opening keynote',
      position: { x: 400, y: 300, floor: 1 },
      floor: 1,
      metadata: {
        startTime: '9:00 AM',
        endTime: '10:30 AM',
        speaker: 'Jane Developer',
        room: 'Main Hall',
      },
      isPulsing: true,
    });
  }

  shutdown(): void {
    this.poiManager.destroy();
  }
}
```

### 2. Use in React Components

```typescript
import { usePOI } from '../hooks/usePOI';

function MyComponent() {
  const { selectedPOI, nearbyPOIs, getPOIsByType, stats } = usePOI();

  return (
    <div>
      {selectedPOI && <div>{selectedPOI.name}</div>}
      <div>Total POIs: {stats.total}</div>
      <div>Sessions: {stats.byType.session || 0}</div>
    </div>
  );
}
```

### 3. Query and Filter POIs

```typescript
// Get all sessions
const sessions = poiManager.getPOIsByType(POIType.SESSION);

// Get POIs on a specific floor
const floor2POIs = poiManager.getPOIsByFloor(2);

// Find nearby POIs
const nearby = poiManager.getPOIsNearPosition(x, y, 150);

// Advanced filtering
const activeSessions = poiManager.findPOIs({
  type: POIType.SESSION,
  floor: 1,
  isActive: true,
});

// Find closest POI
const closest = poiManager.getClosestPOI(x, y, {
  type: [POIType.FOOD, POIType.INFO],
});
```

### 4. Load from Tiled Maps

```typescript
const map = this.make.tilemap({ key: 'map' });
const poiLayer = map.getObjectLayer('POIs');

if (poiLayer) {
  poiManager.loadFromTiledObjectLayer(poiLayer);
}
```

**Tiled Object Properties:**
- `name` - POI name (required)
- `type` - POI type: session, sponsor, food, etc. (required)
- `description` - POI description
- `floor` - Floor number
- `zone` - Zone identifier
- `isActive` - Active state (boolean)
- `isPulsing` - Pulse animation (boolean)
- Custom metadata properties

### 5. Dynamic Management

```typescript
// Highlight POIs
poiManager.highlightPOI('keynote-main');
poiManager.highlightPOIsByType(POIType.SPONSOR);
poiManager.unhighlightAll();

// Set active/inactive
poiManager.setActive('old-session', false);

// Enable distance indicators
poiManager.setShowDistances(true);

// Change proximity radius
poiManager.setProximityRadius(200);

// Get statistics
const stats = poiManager.getStats();
console.log(stats);
// {
//   total: 24,
//   byType: { session: 8, sponsor: 10, food: 6 },
//   active: 20,
//   pulsing: 3
// }
```

## POI Panel UI

The enhanced POI panel automatically displays:
- POI type icon and label
- POI name and description
- Floor information
- Type-specific details:
  - **Sessions**: Time, speaker, room, track, capacity
  - **Sponsors**: Company logo, booth number, website
  - **Food**: Menu type, hours, dietary options
- "Navigate Here" button

## Event Handling

```typescript
import { eventBus } from '../lib/EventBus';

// Listen for POI selection
eventBus.on('poi-selected', (data) => {
  console.log('Selected:', data.poiId);
});

// Listen for hover
eventBus.on('poi-hover-start', (data) => {
  console.log('Hovering:', data.poiId);
});

// Listen for proximity
eventBus.on('poi-proximity', (data) => {
  console.log(`Near ${data.poiId}, distance: ${data.distance}`);
});

// Handle navigation
eventBus.on('navigate-to-poi', (data) => {
  // Implement navigation logic
  scene.cameras.main.pan(data.position.x, data.position.y, 1000);
});
```

## Type-Specific POI Data

### Session POI
```typescript
const sessionPOI: SessionPOI = {
  id: 'session-1',
  type: POIType.SESSION,
  name: 'TypeScript Best Practices',
  position: { x: 400, y: 300 },
  metadata: {
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    speaker: 'John Doe',
    room: 'Room A',
    track: 'Frontend',
    capacity: 100,
    attendeeCount: 75,
  },
};
```

### Sponsor POI
```typescript
const sponsorPOI: SponsorPOI = {
  id: 'sponsor-1',
  type: POIType.SPONSOR,
  name: 'TechCorp Booth',
  position: { x: 800, y: 400 },
  metadata: {
    company: 'TechCorp Inc.',
    logoUrl: '/assets/logo.png',
    booth: 'A-12',
    category: 'Platinum',
    website: 'https://techcorp.com',
  },
};
```

### Food POI
```typescript
const foodPOI: FoodPOI = {
  id: 'food-1',
  type: POIType.FOOD,
  name: 'Coffee Station',
  position: { x: 200, y: 500 },
  metadata: {
    menuType: 'Coffee & Pastries',
    hours: '8:00 AM - 5:00 PM',
    dietaryOptions: ['Vegan', 'Gluten-free'],
    capacity: 50,
  },
};
```

## Best Practices

1. **Always destroy POI Manager** in scene shutdown
2. **Use floor-based loading** for better performance
3. **Set proximity radius** appropriate to your scene size
4. **Use isPulsing sparingly** to highlight important POIs
5. **Implement navigation handling** for the navigate-to-poi event
6. **Track interactions** for analytics using poi-interaction event
7. **Update POI metadata** dynamically (e.g., session attendance)

## Performance Considerations

- POI Manager updates proximity checks every 500ms
- Distance calculations use simple Euclidean distance
- Pulse animations pause during hover to reduce load
- Labels are optional (set `showLabels: false` for better performance)
- Distance indicators update only for nearby POIs

## Future Enhancements

- [ ] Firebase Firestore integration for dynamic POI loading
- [ ] A* pathfinding to POI locations
- [ ] Mini-map with POI markers
- [ ] POI categories and filtering UI
- [ ] POI bookmarking/favorites
- [ ] POI visit tracking and achievements
- [ ] Real-time POI updates (e.g., session capacity changes)
- [ ] Voice navigation to POIs

## See Also

- [POIManager.example.ts](./POIManager.example.ts) - Comprehensive usage examples
- [CLAUDE.md](../../../CLAUDE.md) - Project overview
- [BEAT_STREET_BLUEPRINT.md](../../../BEAT_STREET_BLUEPRINT.md) - Implementation guide
