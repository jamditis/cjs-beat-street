# Beat Street: CJS Navigator - Implementation Blueprint

> **Purpose:** This document is a condensed, actionable guide for building Beat Street in a fresh repository. Copy this file to your new repo as `IMPLEMENTATION.md`.

---

## Quick Facts

| Item | Value |
|------|-------|
| **Project** | Beat Street: CJS Navigator - Isometric conference companion |
| **Event** | CJS2026 (June 8-9, 2026) |
| **Stack** | Vite + React 18 + Phaser 3.60+ + Tailwind CSS |
| **Hosting** | Cloudflare Pages (assets) + Firebase (backend) |
| **Auth** | Cross-project verification via CJS2026 Firebase |
| **Est. Cost** | $0-75/month (free tiers cover most usage) |

---

## 1. Project Setup

### Create New Repo

```bash
# Create and clone
gh repo create beat-street --public --clone
cd beat-street

# Initialize with Vite + React + TypeScript
npm create vite@latest . -- --template react-ts
npm install

# Core dependencies
npm install phaser@3.60.0 \
  firebase \
  @tanstack/react-query \
  tailwindcss postcss autoprefixer \
  framer-motion \
  lucide-react

# Dev dependencies
npm install -D @types/node vite-plugin-pwa workbox-window
```

### Directory Structure

```
beat-street/
├── public/
│   ├── assets/
│   │   ├── tilesets/        # Isometric tile images
│   │   ├── sprites/         # Character animations
│   │   ├── audio/           # Sound effects
│   │   └── maps/            # Tiled JSON exports
│   └── manifest.json        # PWA manifest
├── src/
│   ├── game/
│   │   ├── scenes/          # Phaser scenes
│   │   │   ├── BootScene.ts
│   │   │   ├── PreloadScene.ts
│   │   │   ├── CityMapScene.ts
│   │   │   └── ConventionCenterScene.ts
│   │   ├── entities/        # Player, NPCs
│   │   ├── systems/         # Presence, POI, navigation
│   │   └── config.ts        # Phaser configuration
│   ├── components/          # React UI overlays
│   │   ├── GameContainer.tsx
│   │   ├── POIPanel.tsx
│   │   ├── FloorSelector.tsx
│   │   ├── PresenceList.tsx
│   │   └── ConsentModal.tsx
│   ├── services/
│   │   ├── firebase.ts      # Firebase init
│   │   ├── auth.ts          # Cross-project auth
│   │   ├── presence.ts      # Real-time presence
│   │   └── offline.ts       # IndexedDB cache
│   ├── hooks/
│   │   ├── useGameEvents.ts
│   │   ├── usePresence.ts
│   │   └── useOffline.ts
│   ├── lib/
│   │   └── EventBus.ts      # React ↔ Phaser communication
│   ├── App.tsx
│   └── main.tsx
├── functions/               # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts
│   └── package.json
├── docs/
│   └── IMPLEMENTATION.md    # This file
├── firestore.rules
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

### Tailwind Config (CJS2026 Brand)

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: { 600: '#2A9D8F' },
        cream: '#F5F0E6',
        ink: '#2C3E50',
        paper: '#FAF8F5',
        parchment: '#F0EBE0',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
};
```

---

## 2. Core Architecture

### EventBus (React ↔ Phaser Communication)

```typescript
// src/lib/EventBus.ts
type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach(cb => cb(...args));
  }
}

export const eventBus = new EventBus();
```

### Key Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `poi-selected` | Phaser → React | `{ poiId, type, data }` |
| `floor-changed` | Phaser → React | `{ floor: number }` |
| `entered-building` | Phaser → React | `{ building, floors[], currentFloor }` |
| `exited-building` | Phaser → React | `{}` |
| `switch-floor` | React → Phaser | `floor: number` |
| `player-moved` | Phaser → React | `{ x, y, zone }` |
| `presence-update` | Firebase → React | `{ users: UserPresence[] }` |

### Phaser Config

```typescript
// src/game/config.ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { CityMapScene } from './scenes/CityMapScene';
import { ConventionCenterScene } from './scenes/ConventionCenterScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#F5F0E6',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, CityMapScene, ConventionCenterScene],
  render: {
    pixelArt: true,
    antialias: false,
  },
};
```

### React Map Container

```tsx
// src/components/GameContainer.tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';

export function GameContainer() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(gameConfig);
    }
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="game-container" className="w-full h-full" />;
}
```

---

## 3. Firebase Setup

### New Firebase Project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and create project
firebase login
firebase projects:create beat-street-cjs2026

# Initialize
firebase init
# Select: Firestore, Functions, Hosting
# Use existing project: beat-street-cjs2026
```

### Firestore Collections

```
beat-street-cjs2026/
├── verified_attendees/{attendeeId}
│   ├── uid: string (from CJS2026)
│   ├── displayName: string
│   ├── verifiedAt: timestamp
│   └── expiresAt: timestamp
├── presence/{attendeeId}
│   ├── uid: string
│   ├── zone: string (e.g., "convention-center-floor3")
│   ├── position: { x, y }
│   ├── status: "active" | "idle" | "away"
│   ├── shareLocation: boolean
│   └── lastSeen: timestamp
├── poi/{poiId}
│   ├── type: "session" | "sponsor" | "landmark" | "food"
│   ├── name: string
│   ├── position: { x, y }
│   ├── building?: string
│   ├── floor?: number
│   └── metadata: object
├── achievements/{attendeeId}
│   └── badges: string[]
└── app_config/settings
    └── maintenanceMode: boolean
```

### Cross-Project Auth Verification

```typescript
// functions/src/index.ts
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize with CJS2026 service account for verification
const cjs2026App = initializeApp({
  credential: cert(JSON.parse(process.env.CJS2026_SERVICE_ACCOUNT!)),
}, 'cjs2026');

const cjs2026Db = getFirestore(cjs2026App);
const localDb = getFirestore();

export const verifyAttendee = onRequest({
  cors: true,
  maxInstances: 100,
}, async (req, res) => {
  try {
    const { idToken } = req.body;

    // Verify token with CJS2026 Firebase Auth
    const decodedToken = await getAuth(cjs2026App).verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check registration status in CJS2026 Firestore
    const userDoc = await cjs2026Db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData) {
      res.status(404).json({ verified: false, error: 'User not found' });
      return;
    }

    const isConfirmed =
      userData.registrationStatus === 'confirmed' ||
      (userData.registrationStatus === 'registered' && userData.ticketsPurchased);

    if (!isConfirmed) {
      res.status(403).json({ verified: false, error: 'Not a confirmed attendee' });
      return;
    }

    // Store verified attendee in local Firestore
    const attendeeData = {
      uid,
      displayName: userData.name || userData.displayName,
      organization: userData.organization,
      photoURL: userData.photoURL,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    await localDb.collection('verified_attendees').doc(uid).set(attendeeData);

    res.status(200).json({ verified: true, attendee: attendeeData });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ verified: false, error: 'Verification failed' });
  }
});
```

### Client Auth Service

```typescript
// src/services/auth.ts
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { app } from './firebase';

const VERIFY_ENDPOINT = 'https://verifyattendee-xxxxx.cloudfunctions.net/verifyAttendee';

export async function verifyWithCJS2026(cjs2026IdToken: string) {
  const response = await fetch(VERIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: cjs2026IdToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Verification failed');
  }

  return response.json();
}

export function getCJS2026Token(): string | null {
  // Get from localStorage where CJS2026 app stores it
  // Or use postMessage if game is in iframe
  return localStorage.getItem('cjs2026_id_token');
}
```

---

## 4. Presence System (Privacy-First)

### Consent Modal

```tsx
// src/components/ConsentModal.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

interface ConsentModalProps {
  onConsent: (shareLocation: boolean) => void;
}

export function ConsentModal({ onConsent }: ConsentModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-paper rounded-xl max-w-md p-6 shadow-2xl">
        <h2 className="font-display text-2xl text-ink mb-4">
          Location Sharing
        </h2>

        <p className="text-ink/80 mb-6">
          Would you like other attendees to see your location in Beat Street?
          This helps with networking and finding colleagues.
        </p>

        <div className="space-y-3">
          {/* Equal prominence buttons - GDPR compliant */}
          <button
            onClick={() => onConsent(true)}
            className="w-full py-3 rounded-lg bg-teal-600 text-white font-semibold
                       hover:bg-teal-700 transition-colors"
          >
            Yes, share my location
          </button>

          <button
            onClick={() => onConsent(false)}
            className="w-full py-3 rounded-lg bg-cream text-ink font-semibold
                       border-2 border-ink/20 hover:border-ink/40 transition-colors"
          >
            No, keep my location private
          </button>
        </div>

        <p className="text-xs text-ink/60 mt-4 text-center">
          You can change this anytime in Settings.
          All features work without location sharing.
        </p>
      </div>
    </motion.div>
  );
}
```

### Presence Service

```typescript
// src/services/presence.ts
import {
  doc, setDoc, onSnapshot, collection, query, where,
  serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

interface PresenceData {
  uid: string;
  displayName: string;
  zone: string;
  shareLocation: boolean;
  status: 'active' | 'idle' | 'away';
  lastSeen: any;
}

export function updatePresence(
  uid: string,
  data: Partial<PresenceData>
): Promise<void> {
  return setDoc(doc(db, 'presence', uid), {
    ...data,
    lastSeen: serverTimestamp(),
  }, { merge: true });
}

export function subscribeToZonePresence(
  zone: string,
  callback: (users: PresenceData[]) => void
): () => void {
  const q = query(
    collection(db, 'presence'),
    where('zone', '==', zone),
    where('shareLocation', '==', true),
    where('status', 'in', ['active', 'idle'])
  );

  return onSnapshot(q, snapshot => {
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    })) as PresenceData[];
    callback(users);
  });
}

export function goOffline(uid: string): Promise<void> {
  return deleteDoc(doc(db, 'presence', uid));
}
```

---

## 5. Offline-First PWA

### Vite PWA Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /\/assets\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Beat Street',
        short_name: 'Beat Street',
        description: 'Beat Street: CJS Navigator - Interactive conference companion',
        theme_color: '#2A9D8F',
        background_color: '#F5F0E6',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

### Offline Hook

```typescript
// src/hooks/useOffline.ts
import { useState, useEffect } from 'react';
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'beat-street';
const STORE_NAME = 'offline-data';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [db, setDb] = useState<IDBPDatabase | null>(null);

  useEffect(() => {
    // Initialize IndexedDB
    openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    }).then(setDb);

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheData = async (key: string, data: any) => {
    if (db) await db.put(STORE_NAME, data, key);
  };

  const getCachedData = async (key: string) => {
    if (db) return db.get(STORE_NAME, key);
    return null;
  };

  return { isOnline, cacheData, getCachedData };
}
```

---

## 6. Deployment

### Cloudflare Pages (Recommended for Map Assets)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Deploy
npm run build
wrangler pages deploy dist --project-name=beat-street
```

### Firebase Hosting (Alternative)

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
```

---

## 7. Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create GitHub repo `beat-street`
- [ ] Set up Vite + React + Phaser scaffold
- [ ] Create Firebase project `beat-street-cjs2026`
- [ ] Configure Firestore collections and rules
- [ ] Implement EventBus for React ↔ Phaser
- [ ] Basic Phaser scene with placeholder tiles
- [ ] PWA manifest and service worker

### Phase 2: Authentication (Week 3)
- [ ] Deploy `verifyAttendee` Cloud Function
- [ ] Get CJS2026 service account credentials
- [ ] Implement cross-project auth flow
- [ ] Create ConsentModal component
- [ ] Store verified attendees in Firestore

### Phase 3: Map & Navigation (Weeks 4-6)
- [ ] Download Pittsburgh OSM data
- [ ] Create isometric tileset (Penzilla pack)
- [ ] Build exterior map in Tiled
- [ ] Export and load in Phaser
- [ ] Implement player movement (keyboard + touch)
- [ ] Add camera follow and bounds

### Phase 4: Interior Buildings (Weeks 7-8)
- [ ] Obtain Convention Center floor plans
- [ ] Create multi-floor interior map
- [ ] Implement floor switching system
- [ ] Build FloorSelector UI component
- [ ] Add building entry/exit transitions

### Phase 5: POI System (Weeks 9-10)
- [ ] Define POI types in Firestore
- [ ] Place POIs on maps via Tiled objects
- [ ] Create POIPanel React component
- [ ] Integrate with CJS2026 schedule data
- [ ] Add sponsor booth interactions

### Phase 6: Presence & Social (Weeks 11-12)
- [ ] Implement presence service
- [ ] Real-time user positions (consenting users)
- [ ] Zone-based presence display
- [ ] PresenceList component
- [ ] Privacy controls in settings

### Phase 7: Polish & Launch (Weeks 13-14)
- [ ] Performance optimization
- [ ] Mobile touch controls refinement
- [ ] Offline mode testing
- [ ] Beta testing with sample users
- [ ] Production deployment
- [ ] Documentation

---

## 8. Asset Resources

### Tilesets
- **Penzilla Giant City Builder** - $7 (isometric buildings)
- **Kenney Assets** - Free (various isometric sets)
- **OpenGameArt** - Free (community contributions)

### Map Data
- **OpenStreetMap** - Free Pittsburgh building footprints
- **OSM2World** - Convert OSM to 3D/isometric
- **WPRDC** - Pittsburgh open data (buildings, parcels)

### Tools
- **Tiled Map Editor** - Free (tilemap creation)
- **Aseprite** - $20 (sprite creation/editing)
- **TexturePacker** - Free tier (spritesheet packing)

---

## 9. Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering engine | Phaser 3.60+ | Native isometric support, proven mobile performance |
| UI framework | React 18 | Matches CJS2026 stack, easy overlays |
| Hosting | Cloudflare Pages | Free unlimited bandwidth, global CDN |
| Backend | Firebase | Real-time database, easy auth integration |
| Auth pattern | Cloud Function proxy | Secure cross-project verification |
| Offline strategy | PWA + IndexedDB | Works on poor venue WiFi |
| Privacy model | Opt-in only | GDPR compliant, equal button prominence |
| Map format | Tiled JSON | Industry standard, Phaser native support |

---

## 10. Reference Links

- **Full Plan:** `PITTSBURGH_EXPLORER_PLAN.md` (comprehensive details)
- **CJS2026 Repo:** `github.com/jamditis/cjs2026`
- **Phaser 3 Docs:** `phaser.io/docs`
- **Tiled Manual:** `doc.mapeditor.org`
- **Firebase Docs:** `firebase.google.com/docs`

---

*Generated from CJS2026 planning session. Copy to new repo as starting point.*
