# Beat Street: CJS Navigator

## Executive Summary

An isometric interactive map and conference companion for the 2026 Collaborative Journalism Summit. Attendees navigate a stylized, geotagged cityscape to discover conference venues, local points of interest, restaurants, and networking opportunities.

**Key Differentiator:** Unlike typical conference apps, this creates a memorable, playful experience that encourages exploration while providing practical wayfinding and schedule integration.

**Research-Backed Projections:**
- **340% increase** in sponsor booth visits with scavenger hunt gamification
- **40-50% attendee participation rate** (realistic for 2-day conference)
- **30-40% boost** in overall satisfaction scores
- **$50-80K additional sponsorship revenue** potential from enhanced engagement data

---

## 1. Project Scope & Goals

### Primary Goals
1. **Interactive venue navigation** - Help attendees find conference sessions, sponsor booths, and event locations
2. **Local city guide** - Highlight Pittsburgh restaurants, attractions, and points of interest near the venue
3. **Schedule integration** - Tap locations to see what's happening there and when
4. **Attendee networking** - Optional presence features to see who's exploring nearby (100% consent-based)
5. **Engagement analytics** - Track interactions to generate sponsor reports and inform CJS2027

### Non-Goals (Out of Scope)
- Replacing the main CJS2026 website
- Full multiplayer gameplay mechanics
- VR/AR features
- Native mobile apps (web-first PWA approach)

---

## 2. Technical Architecture

### Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Rendering Engine** | **Phaser 3.60+** or **Phaser 4 RC6** | Native isometric support (v3.50+), up to 16x mobile performance (v4), proven production-ready |
| **UI Framework** | React 18 (wrapper) | Familiar to team, handles menus/modals/overlays via EventBus pattern |
| **Map Data** | OpenStreetMap + OSM2World | Free, accurate Pittsburgh data with building heights, exports to glTF/OBJ |
| **Tile Editor** | Tiled Map Editor | Industry standard for isometric tile maps, exports JSON for Phaser |
| **Static Hosting** | Cloudflare Pages | Free unlimited bandwidth for map assets |
| **Database** | Firebase Firestore (new project) | Real-time sync, user data, POI metadata |
| **Auth** | Cloud Function Proxy | Verify against CJS2026 confirmed attendees (see Section 4) |
| **PWA** | Vite PWA Plugin + Workbox | Offline-first for poor venue WiFi |

### Why Phaser 3.60+ / Phaser 4

**Phaser 4 RC6 (December 2025)** is now production-ready with massive mobile improvements:
- **Up to 16x performance** on mobile for filter-heavy scenes
- **Memory optimization**: Reduced from 16MB to ~5MB RAM/VRAM usage
- **API compatible** with Phaser 3 (no rewrite needed)

**Phaser 3.60+ Key Features:**
- **Native isometric tilemap support** (no plugin needed!)
- **Mobile pipeline**: Automatic iOS/Android optimization, eliminates texture limits
- **Performance benchmarks**: 15,872 → 42,240 texture binds @ 60fps (+166%)

**Decision:** Use Phaser 3.60+ for stability, or Phaser 4 RC6 if targeting maximum mobile performance.

### Native Isometric Support (No Plugin Needed)

```javascript
// Phaser 3.50+ native isometric - no external plugin required
const map = this.make.tilemap({
  key: 'pittsburgh-map',
  tileWidth: 64,
  tileHeight: 32
});

const tileset = map.addTilesetImage('isometric-tiles');
const layer = map.createLayer('Ground', tileset, 0, 0);
layer.setOrientation('isometric'); // Native support!
```

### React Integration (Official Pattern)

Use **Phaser's official React template** with EventBus communication:

```jsx
// EventBus.js - React ↔ Phaser communication
class EventBusClass {
  constructor() { this.events = {}; }
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(fn => fn(...args));
    }
  }
  on(event, fn) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  }
}
export const EventBus = new EventBusClass();

// In Phaser scene
EventBus.emit('session-selected', sessionId);

// In React component
useEffect(() => {
  EventBus.on('session-selected', handleSessionSelect);
}, []);
```

### Touch Controls

Use **Rex Rainbow's Virtual Joystick Plugin** (most actively maintained):

```javascript
import VirtualJoystickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin.js';

// In game config
plugins: {
  global: [{
    key: 'rexVirtualJoystick',
    plugin: VirtualJoystickPlugin,
    start: true
  }]
}

// In scene - 8-directional joystick
this.joyStick = this.plugins.get('rexVirtualJoystick').add(scene, {
  x: 100, y: 500,
  radius: 50,
  base: this.add.circle(0, 0, 50, 0x888888),
  thumb: this.add.circle(0, 0, 25, 0xcccccc),
  dir: '8dir',
});
```

---

## 3. Pittsburgh Map Data Strategy

### Data Sources (All Free)

| Source | Data Type | License | Cost |
|--------|-----------|---------|------|
| **OpenStreetMap** | Building footprints, streets, POIs | ODbL (attribution required) | $0 |
| **Allegheny County GIS** | Building footprints with heights | Public domain | $0 |
| **USGS 3DEP** | LIDAR elevation data (3m resolution) | Public domain | $0 |
| **City of Pittsburgh GIS Hub** | Zoning, parcels, landmarks | Public domain | $0 |

### OSM2World Pipeline (Recommended)

**OSM2World** converts OpenStreetMap data directly to 3D models:
- **Export formats**: glTF, Wavefront OBJ, PNG images
- **Features**: 250+ OSM tags, multiple LOD, texture support
- **Platform**: Java-based, free and open-source

**Workflow:**
```
1. Extract OSM Data
   └─> Overpass Turbo query for downtown Pittsburgh
   └─> Bounding box: 40.435°-40.450° N, 79.990°-80.010° W

2. Process with OSM2World
   └─> Download Pittsburgh OSM extract
   └─> Run: java -jar osm2world.jar --input pittsburgh.osm --output city.gltf
   └─> Export as glTF or OBJ

3. Convert to Isometric Sprites (Blender)
   └─> Import glTF into Blender
   └─> Set orthographic camera at 54.736° X-rotation
   └─> Render individual buildings to PNG sprites

4. Build in Tiled Editor
   └─> Assemble Pittsburgh venue map
   └─> Add interactive object layers
   └─> Export as JSON for Phaser
```

### Art Style: "Sketch & Parchment" (RECOMMENDED)

**Matches CJS2026 website aesthetic:**
- Teal (#2A9D8F) for key buildings, landmarks, interactive elements
- Cream (#F5F0E6) for parchment background, building fills
- Ink (#2C3E50) for outlines, shadows, text
- Hand-drawn watercolor feel with Playfair Display + Caveat fonts

**Implementation Options:**

| Approach | Cost | Time | Quality |
|----------|------|------|---------|
| **Pre-made assets + filters** | $7-50 | 1-2 weeks | Good |
| **AI generation + post-processing** | $20-100 | 2-3 weeks | Excellent |
| **Blender 3D → 2D workflow** | $0-20 | 3-4 weeks | Excellent |
| **Commission pixel artist** | $500-2000 | 4-6 weeks | Premium |

**Recommended Approach:**
1. Purchase [Penzilla Isometric City Builder Pack](https://penzilla.itch.io/giant-city-builder) ($7) - 500+ tiles
2. Use Midjourney ($10/month) for Pittsburgh-specific landmarks
3. Apply watercolor/sketch filters in Photoshop/GIMP
4. Unify with parchment texture overlay

**AI Prompts for Pittsburgh Landmarks:**
```
"PPG Place Pittsburgh, isometric perspective, watercolor sketch style,
parchment backdrop, teal and cream colors, hand-drawn ink outlines"
```

---

## 4. Authentication & Access Control

### Challenge
The game is a **separate Firebase project** but needs to verify users are **confirmed CJS2026 attendees**.

### Recommended: Cloud Function Verification Proxy

**Why this approach:**
- ✅ Simple, secure, maintainable
- ✅ Officially supported Firebase pattern
- ✅ Excellent user experience (transparent to user)
- ✅ Easy to audit and monitor

**Architecture:**
```
User → Beat Street (Project B)
         ↓
         Calls verifyAttendee() Cloud Function
         ↓
      CJS2026 (Project A)
         ↓
         Verifies Firebase token
         Checks registrationStatus === 'confirmed'
         ↓
         Returns { verified: true, attendeeData: {...} }
         ↓
      Beat Street grants access
```

### Implementation

**CJS2026 Cloud Function (add to functions/index.js):**

```javascript
/**
 * Verify CJS2026 attendee for Beat Street
 * Security: rate-limited, audit-logged, App Check supported
 */
exports.verifyAttendeeForGame = onRequest({
  cors: true,
  maxInstances: 100,
  timeoutSeconds: 30
}, async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ verified: false, error: "Method Not Allowed" });
      return;
    }

    try {
      // Verify CJS2026 Firebase token
      const user = await verifyAuthToken(req.headers.authorization);

      // Get user profile
      const userDoc = await db.collection('users').doc(user.uid).get();

      if (!userDoc.exists) {
        res.status(404).json({ verified: false, error: 'User profile not found' });
        return;
      }

      const userData = userDoc.data();

      // Check confirmed attendee status
      const isConfirmed = userData.registrationStatus === 'confirmed'
        || (userData.registrationStatus === 'registered' && userData.ticketsPurchased);

      if (!isConfirmed) {
        await logActivity('game_access_denied', user.uid, {
          reason: 'not_confirmed',
          registrationStatus: userData.registrationStatus
        });

        res.status(403).json({
          verified: false,
          error: 'User is not a confirmed attendee',
          registrationStatus: userData.registrationStatus || 'pending',
          helpUrl: 'https://summit.collaborativejournalism.org/dashboard'
        });
        return;
      }

      // Log successful verification
      await logActivity('game_access_granted', user.uid, {
        registrationStatus: userData.registrationStatus,
        ticketType: userData.ticketType
      });

      // Return success with minimal data
      res.status(200).json({
        verified: true,
        attendeeData: {
          uid: user.uid,
          displayName: userData.name || 'CJS2026 Attendee',
          registrationStatus: userData.registrationStatus,
          ticketType: userData.ticketType || 'General',
          badges: userData.badges || [],
          role: userData.role || 'attendee'
        },
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
      });

    } catch (error) {
      console.error('Verification error:', error);
      res.status(error.message.includes('Missing') ? 401 : 500)
        .json({ verified: false, error: error.message || 'Verification failed' });
    }
  });
});
```

**Beat Street Client:**

```javascript
// Verify user is CJS2026 attendee
async function verifyCJS2026Attendee() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User must be signed in to CJS2026 account');
  }

  const idToken = await user.getIdToken();

  const response = await fetch(
    'https://us-central1-cjs2026.cloudfunctions.net/verifyAttendeeForGame',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();

  if (!data.verified) {
    throw new Error(data.error || 'Not a confirmed CJS2026 attendee');
  }

  return {
    isVerified: true,
    attendeeData: data.attendeeData,
    verifiedAt: Date.now()
  };
}
```

### Access Levels

| Level | Description | Features |
|-------|-------------|----------|
| **Guest** | No login | View map, browse POIs (limited) |
| **Registered** | CJS2026 account, no ticket | Full map, POIs, no networking |
| **Confirmed Attendee** | Verified ticket | Full features including networking |
| **Speaker/Sponsor** | Special badge | Highlighted on map, branded booths |

---

## 5. Privacy-First Location Sharing

### Core Principle
> Location sharing is **100% opt-in**. Users who decline still have **full access to all features** except seeing/being seen by others on the map.

### Regulatory Compliance (GDPR/CCPA 2025)

**Required by law:**
- ✅ "Accept" and "Reject" buttons must be **equally prominent** (Austrian court ruling 2025)
- ✅ No pre-checked consent boxes
- ✅ Withdrawal must be as easy as acceptance
- ✅ WCAG 2.2 compliance required by June 28, 2025 (European Accessibility Act)

### Zone-Based Presence (Not GPS)

**Privacy-preserving approach:**
- Share **zone/room level** location, not exact coordinates
- Example: "Ballroom A" or "Session: Investigative Journalism 101"
- No GPS required - uses in-map position only
- Coarse location protects privacy while enabling networking

### Consent Flow

```
┌─────────────────────────────────────────────────────────────┐
│         Connect with other attendees                        │
│                                                             │
│ See which attendees are in each session and find           │
│ collaborators with shared interests.                        │
│                                                             │
│ We'll show your name and organization to other attendees   │
│ only when you choose to share.                              │
│                                                             │
│ [Learn more]                                                │
│                                                             │
│ ┌─────────────────┐  ┌─────────────────┐                   │
│ │  Enable Sharing │  │    Not Now      │                   │
│ └─────────────────┘  └─────────────────┘                   │
│                                                             │
│ You can change this anytime in Settings                     │
└─────────────────────────────────────────────────────────────┘
```

### Privacy Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Share my presence** | **OFF** | Show avatar to other attendees |
| **Show my name** | **OFF** | Display name or anonymous avatar |
| **Show my organization** | **OFF** | Display org badge |
| **Allow messages** | ON | Receive networking requests |
| **Share with** | N/A | "All attendees" or "My organization only" |

### Technical Implementation

**Firestore Schema:**
```javascript
/sessionPresence/{sessionId}/attendees/{userId}
  - userId: string
  - displayName: string (optional, if user consents)
  - organization: string (optional)
  - sharingLevel: "anonymous" | "name" | "profile"
  - enteredAt: timestamp
  - expiresAt: timestamp (session end time)

/userSettings/{userId}/privacy
  - sharePresence: boolean (default: false)
  - sharingLevel: string
  - consentTimestamp: timestamp
  - consentVersion: string
```

**Security Rules:**
```javascript
match /sessionPresence/{sessionId}/attendees/{odId} {
  // Users can only write their own presence
  allow create, update: if request.auth.uid == userId
    && request.resource.data.sharingConsent == true
    && request.resource.data.expiresAt > request.time;

  // Only read presence of users who opted in
  allow read: if resource.data.sharingConsent == true
    && resource.data.expiresAt > request.time;

  // Users can delete their own presence anytime (revoke consent)
  allow delete: if request.auth.uid == userId;
}
```

### Data Retention
- **Active presence data**: Delete when user leaves zone or stops sharing
- **Analytics**: Aggregate and anonymize before storing
- **Retention window**: 30 days post-summit, then auto-purge
- **User deletion**: Immediate full deletion on request

---

## 6. PWA Offline-First Architecture

### Why Offline-First is Critical
- **Conference venues often have poor WiFi** (high-density usage)
- **Graceful degradation** ensures core experience always works
- **PWA approach** = no app store required, works on all devices

### Storage Limits
- **iOS Safari**: 50MB minimum (plan for this as floor)
- **Chrome/Android**: Up to 20% of free disk space (500MB-2GB typical)
- **Target bundle**: 35-40MB (fits comfortably in iOS limit)

### Vite PWA Configuration

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheBytes: 5 * 1024 * 1024, // 5MB max per file
      },
      manifest: {
        name: 'Beat Street',
        short_name: 'PGH Explorer',
        description: 'Interactive CJS2026 venue guide',
        display: 'fullscreen',
        orientation: 'landscape',
        theme_color: '#2A9D8F',
        background_color: '#F5F0E6'
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.cjs2026\.com\/schedule/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'schedule-cache',
              expiration: { maxAgeSeconds: 30 * 60 }, // 30 minutes
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
};
```

### Caching Strategy by Asset Type

| Asset Type | Strategy | Rationale |
|------------|----------|-----------|
| Game engine/core JS | CacheFirst | Never changes during event |
| Tile sprites/images | CacheFirst | Static assets |
| Schedule/POI data | StaleWhileRevalidate | Show cached, update in background |
| User session state | IndexedDB | Complex data, queued for sync |

### Offline UI Indicators

```jsx
// Network-aware status indicator
function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
  }, []);

  return (
    <div className={online ? 'status-online' : 'status-offline'}>
      {online ? '🟢 Connected' : '🔴 Offline mode'}
    </div>
  );
}
```

---

## 7. Interior Building Exploration

### Overview

Attendees can walk **into and around accurate interior layouts** of key buildings:
- **David L. Lawrence Convention Center** (primary venue - 4 floors)
- **The Westin Pittsburgh** (connected hotel via skywalk)
- **Post-conference venues** (reception locations, restaurants)

This transforms the navigator from a city overview into a **true wayfinding tool** with seamless exterior-to-interior navigation.

### David L. Lawrence Convention Center Layout

Based on official venue documentation, the center spans **1.5 million square feet** across 4 levels:

| Floor | Key Spaces | Size | CJS2026 Use |
|-------|-----------|------|-------------|
| **Floor 1** | Exhibit Halls A & B, Loading Docks | 76,500 sq ft | Sponsor booths, exhibits |
| **Floor 2** | Concourse A, Quiet Room | - | Circulation, accessibility |
| **Floor 3** | Spirit of Pittsburgh Ballroom, 38 meeting rooms, South Terrace | 31,610 sq ft ballroom | Main sessions, registration, receptions |
| **Floor 4** | 13 meeting rooms, 2 lecture halls, North Terrace | 250-seat halls | Breakout sessions, workshops |

**Unique Features to Model:**
- **Column-free exhibit hall** (236,000 sq ft - largest in US)
- **Suspension cable roof** (Pittsburgh bridge-inspired architecture)
- **Green roof terraces** (South: 20,000 sq ft, North: 60,000 sq ft)
- **Skywalk to Westin Hotel** (Floor 3 connection)
- **Riverfront Plaza** (500-foot water feature)

### Multi-Floor Architecture

**Phaser 3.50+ native isometric** supports multi-layer maps. Implementation:

```javascript
// Each floor as separate tilemap layers in single scene
class ConventionCenterScene extends Phaser.Scene {
  create(data) {
    // Load all floor layers
    this.floors = {
      1: this.createFloorLayers('floor1'),
      3: this.createFloorLayers('floor3'),
      4: this.createFloorLayers('floor4')
    };

    // Show only current floor
    this.setActiveFloor(data.entranceFloor || 1);

    // Notify React UI
    EventBus.emit('entered-building', {
      building: 'convention-center',
      floors: [1, 3, 4],
      currentFloor: this.currentFloor
    });
  }

  createFloorLayers(floorKey) {
    const layers = {
      ground: this.map.createLayer(`${floorKey}_ground`, this.tileset),
      walls: this.map.createLayer(`${floorKey}_walls`, this.tileset),
      furniture: this.map.createLayer(`${floorKey}_furniture`, this.tileset),
      interactive: this.map.getObjectLayer(`${floorKey}_interactive`)
    };

    // Hide initially, set depth for proper rendering
    const baseDepth = parseInt(floorKey.replace('floor', '')) * 1000;
    Object.values(layers).forEach((layer, i) => {
      if (layer.setVisible) {
        layer.setVisible(false);
        layer.setDepth(baseDepth + (i * 100));
      }
    });

    return layers;
  }

  setActiveFloor(floorNum) {
    // Hide all floors
    Object.values(this.floors).forEach(floor => {
      Object.values(floor).forEach(layer => {
        if (layer.setVisible) layer.setVisible(false);
      });
    });

    // Show current floor
    Object.values(this.floors[floorNum]).forEach(layer => {
      if (layer.setVisible) layer.setVisible(true);
    });

    this.currentFloor = floorNum;
    EventBus.emit('floor-changed', { floor: floorNum });
  }
}
```

### Exterior-to-Interior Transitions

**Seamless building entry pattern:**

```javascript
// In PittsburghExteriorScene
enterBuilding(buildingId) {
  // Show loading indicator
  EventBus.emit('show-loading', {
    message: 'Entering David L. Lawrence Convention Center...',
    showFloorSelector: true
  });

  // Fade transition
  this.cameras.main.fadeOut(500, 0, 0, 0);

  this.cameras.main.once('camerafadeoutcomplete', () => {
    // Switch to interior scene
    this.scene.start('ConventionCenterScene', {
      entranceFloor: 1,
      returnPosition: { x: this.player.x, y: this.player.y }
    });
  });
}
```

### Floor Transition System

**Elevators and stairs as interactive zones:**

```javascript
// Trigger zones defined in Tiled object layer
createFloorTransitions() {
  const transitions = this.map.getObjectLayer('transitions').objects;

  transitions.forEach(obj => {
    const zone = this.add.zone(obj.x, obj.y, obj.width, obj.height);
    this.physics.world.enable(zone);

    // Properties from Tiled
    zone.targetFloor = obj.properties.find(p => p.name === 'targetFloor')?.value;
    zone.type = obj.properties.find(p => p.name === 'type')?.value; // 'stairs' | 'elevator'

    this.physics.add.overlap(this.player, zone, () => {
      EventBus.emit('floor-transition-available', {
        type: zone.type,
        currentFloor: this.currentFloor,
        targetFloor: zone.targetFloor
      });
    });
  });
}
```

### React Floor Selector UI

```jsx
// components/FloorSelector.jsx
export function FloorSelector() {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [building, setBuilding] = useState(null);

  useEffect(() => {
    EventBus.on('entered-building', ({ building, currentFloor }) => {
      setBuilding(building);
      setCurrentFloor(currentFloor);
    });
    EventBus.on('floor-changed', ({ floor }) => setCurrentFloor(floor));
    EventBus.on('exited-building', () => setBuilding(null));
  }, []);

  if (!building) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2
                    bg-paper rounded-full shadow-lg px-6 py-3
                    flex gap-4 items-center border-2 border-teal-600">
      <span className="font-display text-ink text-sm">Floor:</span>
      {[1, 3, 4].map(floor => (
        <button
          key={floor}
          onClick={() => EventBus.emit('switch-floor', floor)}
          className={`w-10 h-10 rounded-full font-bold transition-all
            ${currentFloor === floor
              ? 'bg-teal-600 text-white scale-110'
              : 'bg-cream text-ink hover:bg-teal-100'}`}
        >
          {floor}
        </button>
      ))}
      <button
        onClick={() => EventBus.emit('exit-building')}
        className="ml-4 text-sm underline text-ink hover:text-teal-600"
      >
        Exit
      </button>
    </div>
  );
}
```

### Floor Plan Data Sources

| Source | Type | Cost | Notes |
|--------|------|------|-------|
| **ExpoFP** | Interactive 3D | Free to view | [expofp.com/david-l-lawrence-convention-center](https://expofp.com/david-l-lawrence-convention-center) |
| **AIA Pittsburgh** | PDF (Floor 1) | Free | [aiapgh.org](https://aiapgh.org/wp-content/uploads/2015/03/GroundFloorParkingEntrance_DLCC.pdf) |
| **Venue Planning Team** | CAD/PDF | Request | Contact [pittsburghcc.com/planners](https://www.pittsburghcc.com/planners/) |
| **Threshold360** | Virtual Tour | Free | [map.threshold360.com/7761098](https://map.threshold360.com/7761098) |

### Tiled Editor Workflow for Interior Maps

```
1. Import Floor Plan as Reference
   └─> Download PDF from AIA Pittsburgh or ExpoFP
   └─> Convert to PNG (300 DPI): pdftoppm -png -r 300 floor-plan.pdf output
   └─> In Tiled: Layer → Image Layer → Load PNG (50% opacity, locked)

2. Set Up Isometric Grid
   └─> Map Properties: Orientation = Isometric
   └─> Tile Size: 64×32 (2:1 ratio)
   └─> Calculate map size from building dimensions

3. Create Layer Structure
   └─> floor1_ground (walkable areas)
   └─> floor1_walls (collision)
   └─> floor1_furniture (tables, booths)
   └─> floor1_interactive (object layer: rooms, elevators)
   └─> Repeat for floor3, floor4

4. Add Interactive Objects (in Tiled)
   └─> Type: "session-room"
   └─> Properties: { roomId, capacity, floor, sessionIds[] }

   └─> Type: "elevator"
   └─> Properties: { servesFloors: [1, 3, 4] }

   └─> Type: "sponsor-booth"
   └─> Properties: { sponsorId, tier }

5. Export as JSON for Phaser
```

### Connected Buildings

**The Westin Pittsburgh (via skywalk):**
- Floor 3 connection point
- Model lobby and key spaces only
- Useful for hotel-based receptions

**Post-Conference Venues:**
- Add as separate interior maps (modular)
- Examples: restaurants, bars, reception halls
- Load on-demand when player approaches

### Interior POI Types

| POI Type | Icon | Interaction |
|----------|------|-------------|
| **Session Room** | 🎤 | Tap → Show current/upcoming sessions |
| **Sponsor Booth** | 🏢 | Tap → Sponsor info, QR check-in |
| **Registration** | 📋 | Tap → Registration info |
| **Restroom** | 🚻 | Tap → Accessibility info |
| **Elevator** | ⬆️ | Tap → Floor selector |
| **Exit** | 🚪 | Tap → Return to exterior map |
| **Food/Drink** | ☕ | Tap → Menu, hours |
| **Terrace** | 🌿 | Tap → Weather, capacity |

### Performance Considerations

**For 1.5M sq ft building:**
- **Chunk loading**: Load only current floor + adjacent areas
- **Layer culling**: Only render visible layers
- **Preload strategy**: Load all floors during entrance transition
- **Memory limit**: Keep under 50MB for iOS PWA support

```javascript
// Chunk-based loading for large floors
const CHUNK_SIZE = 32; // tiles

updateVisibleChunks() {
  const playerChunk = this.getPlayerChunk();
  const visibleRange = 2; // Load 2 chunks in each direction

  for (let x = -visibleRange; x <= visibleRange; x++) {
    for (let y = -visibleRange; y <= visibleRange; y++) {
      this.loadChunk(playerChunk.x + x, playerChunk.y + y);
    }
  }

  // Unload distant chunks
  this.unloadDistantChunks(playerChunk, visibleRange + 1);
}
```

### Mini-Map with Context

```jsx
// Show building location + current floor
function LocationContext({ building, floor }) {
  return (
    <div className="fixed top-4 right-4 bg-paper p-3 rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <Building className="text-teal-600" size={20} />
        <div>
          <div className="font-display text-ink">{building}</div>
          <div className="text-sm text-gray-600">Floor {floor}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-teal-600 underline cursor-pointer"
           onClick={() => EventBus.emit('show-building-map')}>
        View full building map
      </div>
    </div>
  );
}
```

---

## 8. Gamification System

### Research-Backed Feature Selection

**Proven high-ROI features (industry data 2024-2025):**
- **Scavenger hunts**: 340% increase in booth visits
- **Point systems**: 60% increase in participation (when simple)
- **Leaderboards**: Drive competitive engagement (with privacy options)
- **Achievement badges**: 40% increase in networking

### Recommended MVP: Pittsburgh Scavenger Hunt

**20 QR codes across venue:**
- 10 sponsor booths (10 points each)
- 8 session rooms (15 points each)
- 2 Pittsburgh landmarks (5 points each)

**Target:** 45% participation rate

### Achievement Badges (5 Total)

| Badge | Requirement | Difficulty |
|-------|-------------|------------|
| 🏆 **Steel City Explorer** | Visit 5 sponsor booths | Easy |
| 🎓 **Knowledge Seeker** | Attend 3+ sessions | Medium |
| 🤝 **Connector** | Exchange digital card with 3 attendees | Medium |
| 🌟 **Pittsburgh Pioneer** | Complete all landmark check-ins | Easy |
| 👑 **Summit Champion** | Earn 100+ points total | Hard |

### Point System

| Action | Points |
|--------|--------|
| Session attendance (QR scan) | 15 |
| Sponsor booth visit | 10 |
| Profile completion (one-time) | 20 |
| Share on social with #CJS2026 | 5 |
| Connect with attendee in app | 5 |
| Pittsburgh landmark check-in | 5 |

### Leaderboard Design

**Privacy-first approach:**
- **Default**: Private progress tracking (personal rank without public display)
- **Opt-in**: Public leaderboard (display name or real name)
- **Daily resets**: Keep competition fresh, give everyone a chance
- **Top 10 prizes**: CJS swag, coffee vouchers

### Introvert/Extrovert Balance

**Critical finding:** "Gamification can be a game-changer for neurodivergent and introverted individuals"

**Design principles:**
- ✅ Mix solo and team challenges
- ✅ Private progress tracking option
- ✅ Async networking (not all real-time)
- ✅ Clear opt-out (no social pressure)
- ✅ Make high-value rewards achievable without forced networking

---

## 9. Sponsor Analytics & ROI

### Expected Sponsor Value

**Industry benchmarks:**
- **340% increase** in booth visits with gamification
- **145% better ROI** for sponsors with engagement data
- **40% longer dwell time** at gamified booths

### Real-Time Analytics Dashboard

**Sponsor view includes:**
- Live booth visit counter
- Hourly traffic graph
- Average dwell time
- Comparison to event average
- Peak traffic times
- Repeat visitors

### Post-Event Sponsor Report

**Required metrics:**
1. Total unique visitors (with timestamps)
2. Average dwell time per booth
3. Comparative ranking (vs other booths, anonymized)
4. Lead capture rate (if integrated)
5. Social media mentions
6. Content downloads/video completion

**Export formats:** PDF executive summary + CSV raw data

### Revenue Potential

Based on enhanced engagement data:
- **$8,000-15,000 additional per sponsor** (justifiable increase)
- **5-6 sponsors × $10K = $50-80K additional revenue**
- **Development cost: ~$2-5K** (internal time + assets)
- **Net ROI: 1000%+**

---

## 10. Cost Analysis

### Separate Firebase Project (Beat Street)

#### Monthly Costs During Active Use

| Service | Free Tier | Expected Usage | Estimated Cost |
|---------|-----------|----------------|----------------|
| **Cloudflare Pages** | Unlimited | Map assets (100MB) | $0 |
| **Firebase Hosting** | 10GB bandwidth | Minimal (CDN handles assets) | $0 |
| **Firestore** | 50K reads/day | ~200K reads/day peak | $15-30/month |
| **Firebase Auth** | 10K/month | ~2000 users | $0 |
| **Cloud Functions** | 2M invocations | ~500K invocations | $0-5/month |
| **Firebase Storage** | 5GB | User avatars, POI images | $0-5/month |

#### Cost Timeline

| Period | Duration | Est. Monthly Cost | Total |
|--------|----------|-------------------|-------|
| Development | 2-3 months | $0 (free tiers) | $0 |
| Pre-Summit | 2-4 weeks | $10-20 | $20-40 |
| Summit Week | 1 week | $40-75 | $40-75 |
| Post-Summit | 1 month | $10-20 | $10-20 |
| **TOTAL** | ~4 months | - | **$70-135** |

#### Art Asset Costs

| Approach | Cost | Notes |
|----------|------|-------|
| Penzilla pack | $7 | 500+ isometric tiles |
| Aseprite | $20 | Pixel art editing |
| Midjourney (1 month) | $10 | Pittsburgh landmarks |
| **TOTAL** | **$37** | DIY approach |

### Total Project Cost Estimate
- **Minimum (DIY assets):** $100-175
- **Recommended (hybrid approach):** $200-500
- **Premium (commissioned art):** $500-2000

---

## 11. Development Timeline

### Phase 1: Foundation (Weeks 1-4)

| Week | Tasks |
|------|-------|
| **1** | Set up new Firebase project `beat-street-cjs2026`, Cloudflare Pages, GitHub repo |
| **1** | Extract Pittsburgh OSM data, run through OSM2World |
| **2** | Create initial isometric tileset (Penzilla pack + Midjourney landmarks) |
| **2** | Set up Phaser 3.60+ with React wrapper, basic map rendering |
| **3** | Build convention center interior map in Tiled |
| **3** | Implement camera controls (pan, zoom, Rex virtual joystick) |
| **4** | Add POI system, tap-to-view info cards |
| **4** | Cloud Function auth integration with CJS2026 |

### Phase 2: Core Features (Weeks 5-8)

| Week | Tasks |
|------|-------|
| **5** | Schedule integration (sync from CJS2026 Firestore) |
| **5** | Navigation system (tap room → highlight path) |
| **6** | User profiles, privacy-first consent flow |
| **6** | Local Pittsburgh POIs (restaurants, attractions) |
| **7** | QR scavenger hunt, point system, 5 badges |
| **7** | Vite PWA setup with Workbox caching |
| **8** | Mobile optimization, performance testing |

### Phase 3: Polish & Launch (Weeks 9-12)

| Week | Tasks |
|------|-------|
| **9** | Zone-based presence features (opt-in) |
| **9** | Leaderboard with privacy toggle |
| **10** | Sponsor analytics dashboard |
| **10** | Post-event report generation |
| **11** | User acceptance testing with beta testers |
| **11** | WCAG 2.1 AA accessibility audit |
| **12** | Final polish, documentation, launch |

### Key Milestones

| Milestone | Target Date | Description |
|-----------|-------------|-------------|
| **Alpha** | Week 6 | Basic map navigation, POIs, auth working |
| **Beta** | Week 10 | All core features, limited user testing |
| **Launch** | Week 12 | Public release to registered attendees |
| **Summit** | June 8-9 | Full deployment with real-time features |

---

## 12. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Mobile performance issues | Medium | High | Use Phaser 4 for 16x improvement, test on low-end devices |
| Cross-project auth complexity | Low | Medium | Cloud Function proxy is simple, proven pattern |
| Map data accuracy | Low | Medium | OSM2World automates conversion, manual fixes in Tiled |
| Real-time scaling issues | Low | High | Firestore handles 1M+ connections, graceful degradation |
| iOS 50MB storage limit | Medium | Medium | Target 35-40MB bundle, lazy-load extras |

### UX Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users confused by map navigation | Medium | High | Clear onboarding, traditional map fallback |
| Low adoption rate | Medium | High | Integrate with CJS2026 dashboard, clear value proposition |
| Gamification feels forced | Medium | Medium | 100% optional, balance solo/team activities |
| Privacy concerns | Low | High | Privacy-first design, GDPR compliant, clear consent |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Poor venue WiFi | **High** | Medium | **Offline-first PWA architecture** (primary mitigation) |
| Last-minute venue changes | Medium | Medium | Modular map design, quick-edit in Tiled |
| Development timeline slip | Medium | Medium | MVP-first, cut Phase 2 features if needed |

---

## 13. Success Metrics

### Adoption
- **Target:** 45% of confirmed attendees using Beat Street
- **Stretch:** 60%+ adoption

### Engagement
- **Target:** 3+ sessions per user on average
- **Target:** 5+ sponsor booth visits per user
- **Stretch:** 50% of users complete at least one achievement

### Gamification
- **Target:** 340% increase in booth visits (matches industry benchmark)
- **Target:** 60-70% completion rate for easy badges
- **Target:** 25-35% completion rate for hard badges

### Satisfaction
- **Target:** 75% agree "Gamification enhanced my experience" in survey
- **Target:** 90% sponsor satisfaction with engagement data

### Technical
- **Target:** <3 second initial load time
- **Target:** 60fps on 2022+ mobile devices
- **Target:** Zero critical bugs during summit

---

## 14. Open Questions for Discussion

1. **Venue confirmation:** Is David L. Lawrence Convention Center confirmed? Need floor plans.

2. **INN Days integration:** Same Beat Street instance with different POI layer, or separate?

3. **Art style approval:** Review Penzilla pack + Midjourney mockups before production.

4. **Sponsor tiers:** Should sponsors have branded booths/buildings in the navigator?

5. **Beta timing:** How many weeks before summit should beta launch?

6. **Post-summit life:** Archive after 1 month, or keep as Pittsburgh guide?

---

## 15. Next Steps

### Immediate (This Week)
1. [ ] Confirm venue (David L. Lawrence Convention Center)
2. [ ] Create new Firebase project: `beat-street-cjs2026`
3. [ ] Set up GitHub repo: `jamditis/beat-street`
4. [ ] Extract Pittsburgh OSM data for downtown area
5. [ ] Purchase Penzilla asset pack ($7)

### Short-Term (Weeks 1-2)
6. [ ] Generate Pittsburgh landmarks in Midjourney
7. [ ] Prototype Phaser 3.60 + React integration
8. [ ] Build basic map rendering with camera controls
9. [ ] Deploy Cloud Function `verifyAttendeeForGame` to CJS2026

### Decision Points
- [ ] Approve art style direction
- [ ] Confirm feature priority for MVP
- [ ] Set beta launch date
- [ ] Allocate budget ($100-500 range)

---

## Appendix A: Mobile Performance Optimization

### Critical Techniques (2025 Best Practices)

**Canvas Size:**
- Smaller canvas = fewer pixels to redraw
- Target 375px width for mobile, scale up with CSS

**Object Pooling:**
- Reuse game objects instead of creating/destroying
- Critical for games with many dynamic entities

**Texture Atlases:**
- Combine sprites into single atlas (reduces draw calls)
- Power-of-two dimensions (128, 256, 512, 1024)
- Load with: `this.load.atlas('key', 'atlas.png', 'atlas.json')`

**Large Map Chunking:**
- Load/unload map sections dynamically (32x32 tile chunks)
- Only render visible chunks + 1-tile radius
- Use Dynamic Layers (not Static) for camera culling

**Target Metrics:**
- Draw calls: <50 per frame
- Active game objects: <500 visible at once
- Frame budget: <12ms (for 60fps with headroom)

---

## Appendix B: Pittsburgh Data Sources

### OpenStreetMap Query (Overpass Turbo)
```
[out:json][timeout:60];
(
  // Buildings in downtown Pittsburgh
  way["building"](40.435,-80.010,40.450,-79.990);
  relation["building"](40.435,-80.010,40.450,-79.990);

  // Major roads
  way["highway"~"primary|secondary|tertiary"](40.435,-80.010,40.450,-79.990);

  // POIs
  node["amenity"](40.435,-80.010,40.450,-79.990);
  node["tourism"](40.435,-80.010,40.450,-79.990);
);
out body;
>;
out skel qt;
```

### OSM2World Command
```bash
java -jar osm2world.jar \
  --input pittsburgh-downtown.osm \
  --output pittsburgh.gltf \
  --config 2d-to-3d-defaults.properties
```

### Required Attribution
All maps using OpenStreetMap data must include:
> © OpenStreetMap contributors
> https://www.openstreetmap.org/copyright

---

## Appendix C: Accessibility Checklist (WCAG 2.1 AA)

- [ ] Keyboard navigation for all interactions
- [ ] Screen reader announcements for POI selection
- [ ] High contrast mode option (4.5:1 minimum ratio)
- [ ] Reduced motion mode (disable animations)
- [ ] Text alternatives for all visual elements
- [ ] Touch targets minimum 44x44px
- [ ] Color not sole indicator of information
- [ ] Pause/stop for any auto-updating content
- [ ] Focus indicators always visible

---

## Appendix D: Privacy Compliance Checklist

### GDPR Requirements ✓
- [ ] Explicit consent before any location/presence collection
- [ ] Purpose-specific consent (per feature, not blanket)
- [ ] Plain language explanations
- [ ] Equal prominence for accept/reject buttons
- [ ] Easy withdrawal mechanism (one tap to stop sharing)
- [ ] Data minimization (zone-level, not GPS)
- [ ] Time-limited retention with auto-delete
- [ ] Right to access, export, delete data
- [ ] Privacy policy updated with location practices

### CCPA/CPRA Requirements ✓
- [ ] No "dark patterns" (no guilt-tripping, no confusing language)
- [ ] Opt-out not harder than opt-in
- [ ] No pre-checked consent boxes
- [ ] Clear data retention disclosures

---

*Document created: January 7, 2026*
*Last updated: January 7, 2026*
*Research sources: 50+ industry reports, technical documentation, and case studies (2024-2025)*
*Author: Claude Code*
