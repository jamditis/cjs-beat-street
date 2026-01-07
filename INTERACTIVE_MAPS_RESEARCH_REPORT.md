# Interactive Maps Research Report: Beat Street CJS Navigator

**Date:** January 7, 2026
**Scope:** Best practices, tools, and recommendations for mobile/web interactive map interfaces
**Target:** CJS2026 Conference Companion App (June 8-9, 2026)

---

## Executive Summary

This report synthesizes research across six parallel investigations into interactive mapping technologies for web and mobile browsers. Key findings indicate that **Beat Street's current Phaser 3-based architecture is well-suited for the conference use case**, with specific enhancements recommended for stability, performance, and mobile optimization.

### Key Recommendations

1. **Keep Phaser 3** for isometric rendering (leverages 720+ Penzilla sprites)
2. **Add Leaflet 2.0** as optional real-world map overlay for outdoor navigation
3. **Implement critical stability fixes** for iOS Safari WebGL context loss
4. **Optimize mobile touch handling** with proper `touch-action` CSS
5. **Enable offline map caching** via service worker tile caching

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Library Comparison Matrix](#2-library-comparison-matrix)
3. [Mobile Best Practices](#3-mobile-best-practices)
4. [Common Pitfalls & Solutions](#4-common-pitfalls--solutions)
5. [WebGL Performance & Memory](#5-webgl-performance--memory)
6. [Offline/PWA Strategy](#6-offlinepwa-strategy)
7. [Implementation Plan](#7-implementation-plan)
8. [Quick Reference Checklists](#8-quick-reference-checklists)

---

## 1. Current Architecture Analysis

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Layer (App.tsx)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ GameContainer │ POIPanel │ FloorSelector │ TouchUI │ etc │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ EventBus (pub/sub)
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Phaser 3.60 Game Engine                      │
├─────────────────────────────────────────────────────────────────┤
│  Scenes: Boot → Preload → CityMap / ConventionCenter           │
├─────────────────────────────────────────────────────────────────┤
│  Systems:                                                       │
│  ├─ InputManager (keyboard + touch joystick)                   │
│  ├─ CameraController (follow, zoom, pinch-to-zoom)            │
│  ├─ POIManager (interactive points of interest)               │
│  ├─ PresenceManager (attendee markers + clustering)           │
│  └─ MapLoader (Tiled JSON support - placeholder)              │
├─────────────────────────────────────────────────────────────────┤
│  Entities: Player, POI, AttendeeMarker                         │
└─────────────────────────────────────────────────────────────────┘
```

### Strengths

| Area | Implementation | Quality |
|------|---------------|---------|
| **React-Phaser Integration** | EventBus pub/sub pattern | ✅ Excellent |
| **Input Handling** | Unified keyboard + touch with joystick conflict prevention | ✅ Excellent |
| **Camera System** | Smooth lerp follow, multi-method zoom | ✅ Good |
| **POI System** | Flexible registration, proximity events, filtering | ✅ Good |
| **Presence System** | Clustering, status indicators, animations | ✅ Good |
| **Memory Management** | Cleanup in shutdown/destroy methods | ✅ Good |

### Areas for Improvement

| Area | Current State | Recommendation |
|------|--------------|----------------|
| **Map Rendering** | Simple rectangles/circles | Integrate Tiled JSON maps with Penzilla sprites |
| **Isometric Coords** | IsometricUtils defined but unused | Apply 2:1 ratio conversion for sprite placement |
| **Attendee Positions** | Hash-based random placement | Map zones to actual world coordinates |
| **Collision Detection** | Physics enabled but no colliders | Add collision rectangles for buildings |
| **WebGL Context Loss** | Not handled | Add `webglcontextlost` event handlers |
| **Static POI Data** | Hardcoded in scenes | Load from Firestore dynamically |

---

## 2. Library Comparison Matrix

### Primary Libraries (2025-2026)

| Library | Bundle Size | Best For | WebGL | Vector Tiles | React Integration |
|---------|-------------|----------|-------|--------------|-------------------|
| **Leaflet 2.0** | ~38 KB | Simple maps, PWAs | No | Plugin | react-leaflet 5.0 |
| **MapLibre GL JS 5.x** | ~220 KB | Vector tiles, 3D | Yes | Native | react-map-gl |
| **OpenLayers 10.x** | Modular | Enterprise GIS | Partial | Yes | Limited |
| **Mapbox GL JS** | ~220 KB | Premium features | Yes | Native | react-map-gl |
| **Phaser 3.60** | ~400 KB | Game-like UX | Yes | No | Custom (EventBus) |

### Recommendation for Beat Street

**Primary:** Keep Phaser 3.60 for core experience
- Leverages existing 720+ isometric sprites
- Game-like interactions (joystick, zoom, POIs)
- Single WebGL context (better mobile performance)

**Secondary:** Add Leaflet 2.0 for optional real-world overlay
- 38 KB minimal impact on bundle
- Outdoor venue navigation with real GPS
- Easy offline tile caching

### Tile Server Options

| Provider | Free Tier | Offline Caching | Best For |
|----------|-----------|-----------------|----------|
| **Stadia Maps** | Credit-based | Limited mobile | Cost-effective production |
| **MapTiler** | Session-limited | On-premise option | Premium styling |
| **OpenStreetMap** | Unlimited (no high-volume) | Self-host required | Development |
| **Self-hosted** | Infrastructure cost | Full control | Enterprise |

---

## 3. Mobile Best Practices

### Touch Target Sizing

```css
/* Minimum touch targets */
.map-control {
  min-width: 44px;   /* iOS minimum */
  min-height: 44px;
  /* Android: 48x48px preferred */
}

/* Spacing between targets */
.control-group button + button {
  margin-left: 8px;  /* Prevent accidental taps */
}
```

### Thumb Zone Optimization

- **Bottom third of screen:** Most accessible for one-handed use
- **Bottom corners:** Ideal for zoom controls, action buttons
- **Top of screen:** Search bar, settings (less frequent access)

**Beat Street Implementation:**
- Joystick already in bottom-left ✅
- Move zoom controls to bottom-right
- Keep POI panels collapsible from bottom

### Gesture Conflict Resolution

```css
/* Prevent scroll conflicts on map container */
.map-container {
  touch-action: none;  /* Map handles all touch */
}

/* Allow vertical scroll but prevent horizontal on carousels */
.poi-carousel {
  touch-action: pan-y pinch-zoom;
}

/* Modal scroll prevention (iOS fix) */
.modal-open {
  touch-action: none;
  -webkit-overflow-scrolling: none;
  overflow: hidden;
  overscroll-behavior: none;
}
```

### Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **Initial Load** | < 3s | 3-5s | > 5s |
| **Time to Interactive** | < 2.5s | 2.5-4s | > 4s |
| **Frame Rate** | 60 FPS | 30-60 FPS | < 30 FPS |
| **Memory (iOS)** | < 1.5 GB | 1.5-2 GB | > 2 GB |
| **Battery Impact** | Low | Medium | High drain |

---

## 4. Common Pitfalls & Solutions

### Top 10 Critical Issues

#### 1. Memory Leaks from Event Listeners

**Problem:** Event handlers persist after component unmount

```typescript
// ❌ Bad: No cleanup
useEffect(() => {
  eventBus.on('poi-selected', handlePOI);
}, []);

// ✅ Good: Return cleanup function
useEffect(() => {
  const unsub = eventBus.on('poi-selected', handlePOI);
  return () => unsub();  // Or eventBus.off('poi-selected', handlePOI)
}, []);
```

**Beat Street Status:** ✅ Already implemented correctly in hooks

#### 2. WebGL Context Loss (Critical for iOS Safari)

**Problem:** iOS Safari loses WebGL context on background/memory pressure

```typescript
// Add to src/game/scenes/Boot.ts
export class Boot extends Phaser.Scene {
  create() {
    const canvas = this.game.canvas;

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.warn('WebGL context lost');
      this.game.loop.stop();
      eventBus.emit('webgl-context-lost');
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored');
      this.scene.restart();
      this.game.loop.start();
      eventBus.emit('webgl-context-restored');
    });
  }
}
```

**Beat Street Status:** ⚠️ Not implemented - HIGH PRIORITY

#### 3. Phaser Memory Leak in React

**Problem:** New canvas created on each `Phaser.Game` instantiation

```typescript
// src/components/GameContainer.tsx - Current implementation
useEffect(() => {
  if (gameRef.current) return; // Guard against double init

  const game = new Phaser.Game({...});
  gameRef.current = game;

  return () => {
    game.destroy(true, false);
    gameRef.current = null;

    // Manual canvas cleanup if needed
    const canvas = containerRef.current?.querySelector('canvas');
    canvas?.remove();
  };
}, []);
```

**Beat Street Status:** ✅ Partially implemented (needs canvas cleanup verification)

#### 4. iOS Safari Memory Limits (~2GB)

**Problem:** Tab crashes when memory exceeded

**Solutions:**
- Use vector tiles (20-50% smaller than raster)
- Implement aggressive viewport culling
- Monitor with Performance API
- Consider `Phaser.CANVAS` fallback for older devices

```typescript
// Add to game config
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

export const gameConfig = {
  type: isMobile ? Phaser.AUTO : Phaser.WEBGL,
  render: {
    maxTextures: isMobile ? 8 : 16,
    batchSize: isMobile ? 2000 : 4096,
  },
  fps: {
    target: isMobile ? 30 : 60,
  },
};
```

**Beat Street Status:** ⚠️ Uses `Phaser.AUTO` but no mobile-specific limits

#### 5. Marker Performance Degradation

**Problem:** DOM markers struggle with 1000+ elements

**Solution:** Use clustering (already implemented in PresenceManager)

```typescript
// PresenceManager already implements clustering at 80px distance
// Recommendation: Ensure max visible markers limit is enforced
const MAX_VISIBLE_MARKERS = 50;  // Current setting ✅
```

**Beat Street Status:** ✅ Implemented correctly

#### 6. Pinch-to-Zoom vs Joystick Conflict

**Problem:** Two-finger zoom activates when fingers near joystick

**Solution:** Already implemented in CameraController:
```typescript
// Pinch ignored if either pointer in joystick zone
if (this.isInJoystickZone(pointer1) || this.isInJoystickZone(pointer2)) {
  return;  // Don't zoom when touching joystick area
}
```

**Beat Street Status:** ✅ Implemented correctly

#### 7. Floor/Scene Switching Memory Accumulation

**Problem:** Creating/destroying scenes leaks memory over time

**Recommendation:** Use layer visibility instead of scene switching:

```typescript
// Instead of scene switching:
// this.scene.start('ConventionCenter', { floor: 2 });

// Use visibility toggling within same scene:
this.floorLayers[1].setVisible(false);
this.floorLayers[2].setVisible(true);
this.currentFloor = 2;
this.poiManager.filterByFloor(2);
```

**Beat Street Status:** ⚠️ Uses scene switching (acceptable for now, optimize if memory issues arise)

#### 8. Static POI Data

**Problem:** POIs hardcoded, can't update without deploy

**Solution:** Load from Firestore:

```typescript
// In PreloadScene or CityMapScene.create()
const poiSnapshot = await firebase.firestore()
  .collection('poi')
  .where('active', '==', true)
  .get();

poiSnapshot.docs.forEach(doc => {
  this.poiManager.registerPOI({
    id: doc.id,
    ...doc.data()
  });
});
```

**Beat Street Status:** ⚠️ Not implemented (infrastructure ready via POIManager)

#### 9. Attendee Position Randomness

**Problem:** Presence markers appear at hash-based positions, not actual zones

**Solution:** Map zone names to world coordinates:

```typescript
// Add zone coordinate mapping
const ZONE_COORDINATES: Record<string, {x: number, y: number}> = {
  'main-hall': { x: 400, y: 300 },
  'exhibit-a': { x: 800, y: 400 },
  'registration': { x: 200, y: 200 },
  // ... etc
};

// Update PresenceManager.calculatePositionForUser()
calculatePositionForUser(user: AttendeePresence): {x: number, y: number} {
  const zoneCoords = ZONE_COORDINATES[user.zone];
  if (zoneCoords) {
    // Add small random offset within zone
    return {
      x: zoneCoords.x + (Math.random() - 0.5) * 100,
      y: zoneCoords.y + (Math.random() - 0.5) * 100,
    };
  }
  // Fallback to current hash-based calculation
  return this.hashBasedPosition(user);
}
```

**Beat Street Status:** ⚠️ Not implemented (placeholder in PresenceManager)

#### 10. Missing Collision Detection

**Problem:** Player walks through buildings

**Solution:** Add collision rectangles:

```typescript
// In CityMapScene.createBuildings()
const conventionCenter = this.add.rectangle(600, 500, 200, 150, 0x2a9d8f);
this.physics.add.existing(conventionCenter, true); // Static body

// Add collision with player
this.physics.add.collider(this.player.sprite, conventionCenter);
```

**Beat Street Status:** ⚠️ Physics enabled but no collision objects

---

## 5. WebGL Performance & Memory

### Browser-Specific Constraints

| Browser | WebGL Contexts | Memory Limit | Key Issues |
|---------|---------------|--------------|------------|
| **iOS Safari** | ~8 | ~2 GB | Context loss on background, canvas resize leak |
| **Chrome Android** | 8 per renderer | Varies | Passive event listener defaults |
| **Chrome Desktop** | 16 per renderer | Higher | 80% disk space cache limit |
| **Firefox Mobile** | 2-4 | Varies | Slower marker addition |

### Memory Optimization Checklist

```typescript
// 1. Reuse TypedArrays (don't create in loops)
const reusableBuffer = new Float32Array(10000);

// 2. Object pooling for frequent creates
class MarkerPool {
  private available: AttendeeMarker[] = [];

  acquire(): AttendeeMarker {
    return this.available.pop() || new AttendeeMarker();
  }

  release(marker: AttendeeMarker): void {
    marker.reset();
    this.available.push(marker);
  }
}

// 3. Monitor memory in development
if (performance.memory) {
  setInterval(() => {
    const mb = performance.memory.usedJSHeapSize / 1024 / 1024;
    if (mb > 1500) console.warn(`Memory: ${mb.toFixed(0)}MB`);
  }, 5000);
}
```

### Phaser-Specific Optimizations

```typescript
// Mobile-optimized game config
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,           // Better for isometric sprites
    antialias: !isMobile,     // Disable on mobile
    powerPreference: isMobile ? 'low-power' : 'high-performance',
  },
  fps: {
    target: isMobile ? 30 : 60,
    forceSetTimeOut: isMobile, // More battery-friendly
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,           // Disable in production
    },
  },
};
```

---

## 6. Offline/PWA Strategy

### Current Beat Street PWA Setup

- Vite PWA plugin configured ✅
- Workbox service worker ✅
- App icons generated ✅

### Recommended Tile Caching Strategy

```typescript
// vite.config.ts - Add to VitePWA config
VitePWA({
  workbox: {
    runtimeCaching: [
      // Cache game assets aggressively
      {
        urlPattern: /^\/assets\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'game-assets-v1',
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      // Cache API responses with revalidation
      {
        urlPattern: /^https:\/\/.*firestore\.googleapis\.com\/.*/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'firebase-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
        },
      },
      // If using external map tiles (future)
      {
        urlPattern: /^https:\/\/.*\.tile\..*\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles-v1',
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
    ],
  },
})
```

### IndexedDB for Structured Data

```typescript
// src/services/offlineStorage.ts
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'beat-street-offline';
const DB_VERSION = 1;

export async function initOfflineDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // POI data cache
      if (!db.objectStoreNames.contains('pois')) {
        db.createObjectStore('pois', { keyPath: 'id' });
      }
      // Schedule cache
      if (!db.objectStoreNames.contains('schedule')) {
        db.createObjectStore('schedule', { keyPath: 'sessionId' });
      }
      // User preferences
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'key' });
      }
    },
  });
}

export async function cachePOIs(pois: POIData[]): Promise<void> {
  const db = await initOfflineDB();
  const tx = db.transaction('pois', 'readwrite');
  await Promise.all(pois.map(poi => tx.store.put(poi)));
  await tx.done;
}

export async function getCachedPOIs(): Promise<POIData[]> {
  const db = await initOfflineDB();
  return db.getAll('pois');
}
```

---

## 7. Implementation Plan

### Phase 1: Stability Fixes (Priority: High)

**Timeline: 1-2 days**

1. **WebGL Context Loss Handling**
   - File: `src/game/scenes/Boot.ts`
   - Add context lost/restored event listeners
   - Emit events for React UI to show recovery message

2. **Mobile Performance Config**
   - File: `src/game/config.ts`
   - Add mobile detection
   - Set appropriate FPS/texture limits

3. **Canvas Cleanup Verification**
   - File: `src/components/GameContainer.tsx`
   - Verify canvas is removed on unmount
   - Test with React Strict Mode

### Phase 2: Data Integration (Priority: Medium)

**Timeline: 2-3 days**

1. **Firestore POI Loading**
   - Create `src/services/poiService.ts`
   - Load POIs in PreloadScene
   - Implement offline fallback with IndexedDB

2. **Zone Coordinate Mapping**
   - File: `src/game/systems/PresenceManager.ts`
   - Define zone-to-coordinate mapping
   - Update `calculatePositionForUser()`

3. **Dynamic Schedule Integration**
   - Load session data from Firestore
   - Update POI types/metadata in real-time

### Phase 3: Mobile UX Enhancements (Priority: Medium)

**Timeline: 2-3 days**

1. **Touch Target Optimization**
   - Audit all interactive elements for 44px minimum
   - Move controls to thumb-friendly zones

2. **Gesture Refinement**
   - Add `touch-action` CSS where needed
   - Implement pull-to-refresh prevention on map

3. **Loading States**
   - Replace spinners with skeleton screens
   - Add progressive content loading

### Phase 4: Optional Map Integration (Priority: Low)

**Timeline: 3-5 days (if needed)**

1. **Leaflet Integration**
   - Add Leaflet 2.0 as optional overlay
   - Create toggle between isometric/real-world view
   - Implement tile caching

2. **GPS Integration**
   - Use Geolocation API for outdoor positioning
   - Sync with Phaser player position

### Phase 5: Monitoring & Polish (Priority: Medium)

**Timeline: 1-2 days**

1. **Error Tracking**
   - Integrate Sentry for error reporting
   - Add custom WebGL context loss tracking

2. **Performance Monitoring**
   - Implement FPS tracking
   - Add memory usage alerts
   - Track Time to Interactive

---

## 8. Quick Reference Checklists

### Pre-Launch Checklist

- [ ] WebGL context loss handlers implemented
- [ ] Mobile FPS/texture limits configured
- [ ] All event listeners have cleanup
- [ ] Test on iOS Safari 18.4+
- [ ] Test on low-end Android devices
- [ ] Verify offline functionality
- [ ] Error tracking configured
- [ ] Performance budgets set (16ms render, <3s load)

### Testing Matrix

| Device | Browser | Priority | Focus Areas |
|--------|---------|----------|-------------|
| iPhone 13+ | Safari | Critical | Memory limits, context loss |
| iPhone 11 | Safari | High | Performance on older hardware |
| Pixel 6 | Chrome | High | Touch handling, offline |
| Samsung Galaxy | Chrome | Medium | WebGL compatibility |
| iPad | Safari | Medium | Large viewport, tablet UI |
| Desktop | Chrome | Low | Baseline functionality |

### Performance Monitoring KPIs

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| FPS (mobile) | 30+ | < 20 |
| FPS (desktop) | 60 | < 45 |
| Memory Growth | < 10 MB/min | > 50 MB/min |
| Context Loss Rate | < 0.1% | > 1% |
| Load Time | < 3s | > 5s |
| Tile Load Errors | < 5% | > 10% |

---

## Appendix A: Library Version Reference

| Library | Recommended Version | Notes |
|---------|---------------------|-------|
| Phaser | 3.60+ | Current: 3.60 ✅ |
| React | 18.x | Current: 18 ✅ |
| Leaflet | 2.0 (when stable) | Alpha available |
| MapLibre GL JS | 5.x | If vector tiles needed |
| Workbox | 7.x | Via vite-plugin-pwa |
| Firebase | 10.x | Current ✅ |

## Appendix B: Key Documentation Links

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [Leaflet 2.0 Migration](https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html)
- [WebGL Best Practices (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [PWA Caching Strategies](https://web.dev/learn/pwa/caching)

---

*Report generated from parallel research across OpenStreetMaps integration, WebGL solutions, mobile best practices, stability patterns, and codebase analysis.*
