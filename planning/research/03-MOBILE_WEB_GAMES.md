# Mobile Web Game Optimization (2026)

**Research Date:** January 7, 2026
**Focus:** Mobile browser optimization, iOS Safari, PWA strategies

---

## Table of Contents

1. [Touch Input Optimization](#touch-input-optimization)
2. [Mobile Browser Compatibility](#mobile-browser-compatibility)
3. [Battery and Thermal Management](#battery-and-thermal-management)
4. [Network Optimization](#network-optimization)
5. [Service Worker Strategies](#service-worker-strategies)
6. [Virtual Controls](#virtual-controls)
7. [Screen Orientation](#screen-orientation)
8. [Mobile Performance Bottlenecks](#mobile-performance-bottlenecks)
9. [iOS Safari Quirks](#ios-safari-quirks)

---

## Touch Input Optimization

### Key Statistics (2026)

- **70% of players prefer gesture-based mechanics**
- **49-75% of users operate phones one-handed**
- **30% increase in retention** with thoughtful gesture design
- **25% boost in satisfaction** with haptic feedback

### Touch Target Sizing

**Minimum: 44×44 pixels** for all interactive elements

```typescript
// ✅ Ensure tap targets are large enough
const poiMarker = this.add.sprite(x, y, 'poi-icon');
poiMarker.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
// 60px diameter (30px radius) = comfortable tap target
```

### Gesture Implementation

```typescript
// In Phaser scenes
scene.input.on('pointerdown', handler);    // touchstart
scene.input.on('pointermove', handler);    // touchmove
scene.input.on('pointerup', handler);      // touchend

// Multi-touch for gestures
const pointer1 = this.input.pointer1;
const pointer2 = this.input.pointer2;
const distance = Phaser.Math.Distance.Between(
  pointer1.x, pointer1.y,
  pointer2.x, pointer2.y
);
```

### Haptic Feedback

```typescript
// Provide tactile feedback for critical actions
function vibrate(duration: number = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

// On POI selection
eventBus.on('poi-selected', () => {
  vibrate(15); // Short vibration
});
```

### Responsiveness & Feedback

- Provide **immediate visual feedback** for all touches
- Show animations, color changes, or scale effects
- Ensure gesture recognition is **prompt and accurate**
- Test on actual devices, not just desktop touch simulation

---

## Mobile Browser Compatibility

### Market Share (2026)

- **Chrome dominates:** 65.8% of mobile browsers
- **Chrome Android:** 40.58% of total browser market
- **Safari iOS:** 92% default browser among iOS users

### Browser-Specific Considerations

**Chrome Android:**
- ✅ Pre-installed on most devices
- ✅ Excellent WebGL support
- ✅ Full PWA capabilities
- ✅ Best debugging with Chrome DevTools

**Safari iOS:**
- ⚠️ Conservative WebGL implementation
- ⚠️ Mandatory WebKit for all iOS browsers
- ⚠️ PWA features on Apple's timeline
- ⚠️ 50MB cache limit (critical constraint)

### Testing Strategy

1. **Primary targets:**
   - Chrome Android (latest 2 versions)
   - Safari iOS (latest 2 versions)

2. **Use BrowserStack** for cross-device testing

3. **Test on real devices** - touch behavior differs from emulators

### Feature Detection (Not Browser Detection)

```typescript
// ✅ Always feature-detect
const hasServiceWorker = 'serviceWorker' in navigator;
const hasNotifications = 'Notification' in window;
const hasGeolocation = 'geolocation' in navigator;

// ❌ Never browser-detect
if (navigator.userAgent.includes('Safari')) { /* bad */ }
```

---

## Battery and Thermal Management

### Research Findings

**Energy consumption is directly proportional to pixels drawn on canvas.**

### Game Loop Optimization

```typescript
// Pause game when tab not visible
this.events.on('hidden', () => {
  this.scene.pause();
  this.sound.pauseAll();
});

this.events.on('visible', () => {
  this.scene.resume();
  this.sound.resumeAll();
});
```

### Physics Management

```typescript
// Disable physics when characters aren't moving
if (player.body.velocity.x === 0 && player.body.velocity.y === 0) {
  this.physics.world.pause();
}

// Re-enable when movement detected
this.input.on('pointerdown', () => {
  this.physics.world.resume();
});
```

### Canvas Size Optimization

```typescript
// Consider fixed canvas dimensions
scale: {
  mode: Phaser.Scale.FIT,
  width: 800,   // Fixed size, not fullscreen
  height: 600,
  max: {
    width: 1200,  // Maximum dimensions
    height: 900
  }
}
```

### Thermal Throttling Detection

```typescript
// Monitor frame rate drops
let frameDrops = 0;
this.time.addEvent({
  delay: 1000,
  callback: () => {
    const fps = this.game.loop.actualFps;
    if (fps < 50) frameDrops++;

    if (frameDrops > 10) {
      // Device is thermal throttling
      this.reduceVisualQuality();
    }
  },
  loop: true
});
```

---

## Network Optimization

### Offline-First Architecture

```typescript
interface SyncQueue {
  timestamp: number;
  action: 'update_location' | 'toggle_visibility';
  data: unknown;
}

class OfflineManager {
  private queue: SyncQueue[] = [];

  async syncWhenOnline() {
    if (navigator.onLine) {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        await this.processSync(item);
      }
    }
  }

  queueAction(action: string, data: unknown) {
    this.queue.push({ timestamp: Date.now(), action, data });
    this.syncWhenOnline(); // Optimistic sync
  }
}
```

### Progressive Enhancement

1. **Core offline:** Map browsing, POI info from cache
2. **Enhanced online:** Real-time presence, live updates
3. **Graceful degradation:** Show offline indicators

### Optimistic Updates

```typescript
async togglePresence(visible: boolean) {
  // Update local state immediately
  this.presenceVisible = visible;
  this.updateUI();

  try {
    // Sync to Firebase in background
    await updateDoc(presenceRef, { visible });
  } catch (error) {
    // Revert on failure
    this.presenceVisible = !visible;
    this.updateUI();
    this.queueForRetry();
  }
}
```

---

## Service Worker Strategies

### Recommended Caching Strategies

- **Cache-First:** Static game assets (sprites, tilesets, audio)
- **Stale-While-Revalidate:** Semi-dynamic (POI data, maps)
- **Network-First:** Frequently changing (presence, leaderboards)

### Workbox Configuration (Vite PWA)

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      workbox: {
        runtimeCaching: [
          {
            // Cache-First for game assets
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Stale-While-Revalidate for POI data
            urlPattern: /firestore\.googleapis\.com\/.*\/poi\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'poi-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
            },
          },
          {
            // Network-First for presence
            urlPattern: /firestore\.googleapis\.com\/.*\/presence\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'presence-data',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### Pre-caching Critical Assets

```typescript
// sw.ts
const criticalAssets = [
  '/assets/tilesets/penzilla_001.png',
  '/assets/tilesets/penzilla_002.png',
  '/assets/ui/loading-spinner.svg',
  '/assets/maps/convention-center.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('game-core-v1').then((cache) => {
      return cache.addAll(criticalAssets);
    })
  );
});
```

### Cache Management

```typescript
// Clear old caches on activation
self.addEventListener('activate', (event) => {
  const cacheWhitelist = ['game-core-v1', 'images', 'poi-data'];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

**⚠️ Important:** iOS Safari has 50MB cache limit - monitor size!

---

## Virtual Controls

### For Beat Street

Given your isometric point-and-click design:

1. **Tap-to-move** (more intuitive than joystick for exploration)
2. **Context-sensitive controls** near interaction points
3. **Gesture-based camera** (already implemented: pinch-zoom, pan)

### If Virtual Joystick Needed

```typescript
export class VirtualJoystick {
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private isPressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.base = scene.add.circle(x, y, 50, 0x888888, 0.5);
    this.thumb = scene.add.circle(x, y, 25, 0xcccccc, 0.8);

    this.base.setScrollFactor(0).setDepth(1000);
    this.thumb.setScrollFactor(0).setDepth(1001);

    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
  }

  getDirection(): { x: number; y: number; angle: number } {
    const dx = this.thumb.x - this.base.x;
    const dy = this.thumb.y - this.base.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      x: distance > 5 ? dx / 50 : 0,
      y: distance > 5 ? dy / 50 : 0,
      angle: Math.atan2(dy, dx),
    };
  }
}
```

### Positioning Guidelines

- **Thumb-reach zone:** Bottom 1/3 of screen, sides
- **Semi-transparent:** Don't obscure game view
- **Dynamic positioning:** Appear where user first touches

---

## Screen Orientation

### For Beat Street (Isometric Map)

**Recommendation: Support both orientations**

Isometric maps work well in both landscape and portrait.

### CSS Media Query Approach

```css
/* Landscape optimizations */
@media (orientation: landscape) {
  #game-container {
    width: 70vw;
    max-width: 1200px;
  }

  .ui-panels {
    flex-direction: row; /* Side-by-side */
  }
}

/* Portrait optimizations */
@media (orientation: portrait) {
  #game-container {
    width: 100vw;
    max-width: 600px;
  }

  .ui-panels {
    flex-direction: column; /* Stacked */
  }
}
```

### JavaScript Detection

```typescript
useEffect(() => {
  const handleOrientationChange = () => {
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    setIsLandscape(isLandscape);

    // Resize Phaser game
    if (gameRef.current) {
      gameRef.current.scale.resize(
        window.innerWidth,
        window.innerHeight
      );
    }
  };

  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);

  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleOrientationChange);
  };
}, []);
```

**Best Practice:** Don't lock orientation - let users choose their preference.

---

## Mobile Performance Bottlenecks

### Three Main Areas

1. **CPU-bound:** Context setup, JavaScript logic
2. **GPU-bound:** Rendering, shaders, draw calls
3. **Memory issues:** Especially on mobile devices

### Draw Call Reduction (Critical)

```typescript
// ❌ BAD: Individual draw calls
sprites.forEach(sprite => sprite.render());

// ✅ GOOD: Batch rendering with texture atlases
const batch = this.add.renderTexture(0, 0, 800, 600);
sprites.forEach(sprite => batch.draw(sprite, sprite.x, sprite.y));
```

### Texture Atlas Usage (Critical for Beat Street)

**Instead of 720+ individual files:**
```typescript
this.load.image('building_001', 'penzilla_001.png');
// ... 719 more
```

**Use texture atlases:**
```typescript
this.load.atlas('buildings', 'buildings.png', 'buildings.json');
this.load.atlas('characters', 'characters.png', 'characters.json');
```

### Dynamic Quality Adjustment

```typescript
class PerformanceMonitor {
  private frameHistory: number[] = [];
  private currentQuality: 'high' | 'medium' | 'low' = 'high';

  update() {
    const fps = this.game.loop.actualFps;
    this.frameHistory.push(fps);

    if (this.frameHistory.length > 60) {
      this.frameHistory.shift();
    }

    const avgFps = this.frameHistory.reduce((a, b) => a + b) / this.frameHistory.length;

    if (avgFps < 30 && this.currentQuality !== 'low') {
      this.reduceQuality();
    } else if (avgFps > 55 && this.currentQuality !== 'high') {
      this.increaseQuality();
    }
  }

  reduceQuality() {
    // Disable particle effects
    this.particleEmitters.forEach(e => e.stop());

    // Lower resolution
    this.game.scale.setZoom(0.8);

    this.currentQuality = 'low';
  }
}
```

### Object Pooling

```typescript
class SpritePool {
  private pool: Phaser.GameObjects.Sprite[] = [];
  private active: Phaser.GameObjects.Sprite[] = [];

  get(scene: Phaser.Scene, x: number, y: number, texture: string) {
    let sprite = this.pool.pop();

    if (!sprite) {
      sprite = scene.add.sprite(x, y, texture);
    } else {
      sprite.setPosition(x, y).setTexture(texture);
      sprite.setActive(true).setVisible(true);
    }

    this.active.push(sprite);
    return sprite;
  }

  release(sprite: Phaser.GameObjects.Sprite) {
    const index = this.active.indexOf(sprite);
    if (index !== -1) {
      this.active.splice(index, 1);
      sprite.setActive(false).setVisible(false);
      this.pool.push(sprite);
    }
  }
}
```

---

## iOS Safari Quirks and Limitations

### Critical Limitations

**Storage Constraints (CRITICAL):**
- **50MB cache limit** - very restrictive
- **7-day cap** on script-writable storage
- **Automatic cache clearing** after weeks of non-use

**Installation Friction:**
- **4+ tap manual process** (Share → Add to Home Screen)
- **No automatic install prompts**
- Drastically reduces install rates

**Performance Issues:**
- Service workers may not cache correctly
- Persistent bugs in PWA functionality
- WebKit-only rendering (no engine choice)

### Work Within Storage Limits

```typescript
async function estimateAssetSize() {
  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 52428800; // ~50MB default

  console.log(`Cache usage: ${(usage / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Remaining: ${((quota - usage) / 1024 / 1024).toFixed(2)}MB`);

  // iOS Safari: warn if approaching 40MB
  if (usage > 41943040 && isIOSSafari()) {
    showWarning('Storage nearly full. Some features may be limited.');
  }
}

function isIOSSafari() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua);
  return iOS && webkit && notChrome;
}
```

### Aggressive Asset Compression

```bash
# Target: <30MB total for iOS comfort zone
npx imagemin 'assets/tilesets/*.png' \
  --out-dir='dist/assets/tilesets' \
  --plugin=pngquant
```

### iOS-Optimized Loader

```typescript
class iOSOptimizedLoader {
  private loadedSize = 0;
  private readonly MAX_CACHE_SIZE = 30 * 1024 * 1024; // 30MB safe limit

  async loadAsset(url: string, priority: 'high' | 'low') {
    // Skip if approaching limit on iOS
    if (isIOSSafari() && this.loadedSize > this.MAX_CACHE_SIZE) {
      console.warn('Cache limit reached, skipping:', url);
      return null;
    }

    const response = await fetch(url);
    const blob = await response.blob();

    this.loadedSize += blob.size;

    return blob;
  }

  unloadOldAssets() {
    // For iOS: aggressively remove old assets
    if (isIOSSafari()) {
      this.textures.remove('old-scene-assets');
      this.loadedSize = this.recalculateSize();
    }
  }
}
```

### User Education

```tsx
function showInstallPrompt() {
  if (isIOSSafari() && !isStandalone()) {
    return (
      <div className="ios-install-prompt">
        <p>Install Beat Street for the best experience:</p>
        <ol>
          <li>Tap the Share button</li>
          <li>Scroll down and tap "Add to Home Screen"</li>
          <li>Tap "Add" in the top right corner</li>
        </ol>
      </div>
    );
  }
}

function isStandalone() {
  return (window.navigator as any).standalone === true ||
         window.matchMedia('(display-mode: standalone)').matches;
}
```

---

## Priority Recommendations for Beat Street

### Immediate Actions (High Impact)

1. **Create Texture Atlases**
   - Combine 720+ sprites into 5-10 atlases
   - Target: <30MB total for iOS
   - Impact: 60% faster loading

2. **Implement Performance Monitoring**
   - FPS counter
   - Thermal throttling detection
   - Dynamic quality adjustment

3. **Optimize Service Worker Caching**
   - Cache-First for sprites
   - Stale-While-Revalidate for POI data
   - Network-First for presence

4. **Test on Real iOS Devices**
   - Verify 50MB limit behavior
   - Test service worker reliability
   - Measure battery drain

5. **Enhance Touch Interactions**
   - Increase tap targets to 44px
   - Add haptic feedback for POI interactions
   - Optimize gesture responsiveness

### Medium Priority

6. **Object Pooling** - For sprites, particles, UI
7. **Lazy Loading** - Load by zone/area
8. **Offline-First** - Queue updates when offline

---

## Sources

- [Mobile touch controls - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch)
- [Mobile Game Testing: Touch & Gesture](https://blog.nashtechglobal.com/mobile-game-testing-touch-gesture-testing/)
- [PWA on iOS - Limitations 2025](https://brainhub.eu/library/pwa-on-ios)
- [Energy Consumption of Web Games - Phaser](https://phaser.io/news/2021/07/energy-consumption-of-web-games)
- [Strategies for service worker caching - Workbox](https://developer.chrome.com/docs/workbox/caching-strategies-overview)
- [Safari vs Chrome 2026](https://www.expressvpn.com/blog/chrome-vs-safari-best-browser-for-iphone-and-mac/)
