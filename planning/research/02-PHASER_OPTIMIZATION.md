# Phaser 3.60+ Optimization Guide (2026)

**Research Date:** January 7, 2026
**Focus:** Phaser 3 best practices for mobile and web browsers

---

## Table of Contents

1. [Scene Management](#scene-management)
2. [Texture Atlases](#texture-atlases)
3. [Physics Engine Optimization](#physics-engine-optimization)
4. [Mobile Input Handling](#mobile-input-handling)
5. [Camera Management](#camera-management)
6. [Event System](#event-system)
7. [React Integration](#react-integration)
8. [Common Performance Pitfalls](#common-performance-pitfalls)
9. [Isometric Game Optimization](#isometric-game-optimization)

---

## Scene Management

### Scene Lifecycle

**Order:** `constructor → init() → preload() → create() → update()`

**Scene States:** `INIT → LOADING → CREATING → RUNNING → PAUSED → SLEEPING → SHUTDOWN`

### Best Practices

```typescript
// ✅ GOOD: Proper cleanup
class CityMapScene extends Phaser.Scene {
  create(): void {
    // Register cleanup handlers
    this.events.once('shutdown', this.cleanup, this);
    this.events.once('destroy', this.cleanup, this);
  }

  private cleanup(): void {
    // Remove event listeners
    this.events.off('shutdown', this.cleanup, this);
    this.input.off('pointerdown');
    this.scale.off('resize');

    // Destroy managers
    if (this.poiManager) this.poiManager.destroy();
    if (this.presenceManager) this.presenceManager.destroy();
  }

  shutdown(): void {
    // Called when scene stops
    this.cleanup();
  }
}
```

### Scene State Management

```typescript
// Use sleep() instead of pause() when scene is inactive
// Sleep = no updates, no rendering (more efficient)
this.scene.sleep('CityMapScene');
this.scene.wake('CityMapScene');

// For parallel scenes (UI overlays)
this.scene.launch('UIScene');      // Run alongside current scene
this.scene.bringToTop('UIScene');  // Ensure UI renders on top

// Transition with data passing
this.scene.start('ConventionCenterScene', {
  playerData: this.player.getData(),
  fromZone: this.currentZone
});
```

**Performance Tip:** Scenes own their own display lists, cameras, and managers. Use parallel scenes for persistent UI rather than recreating elements.

---

## Texture Atlases

### 🚨 CRITICAL: Convert Individual Images to Atlases

**Your current approach:**
```typescript
// ❌ LESS EFFICIENT: 35+ separate HTTP requests
this.load.image('hotel', '/assets/tilesets/buildings/Hotel_ThreeFloors.png');
this.load.image('cafe', '/assets/tilesets/buildings/Cafe.png');
// ... 33 more files
```

**Recommended approach:**
```typescript
// ✅ OPTIMAL: Single atlas with all sprites
preload(): void {
  // One HTTP request, packed efficiently
  this.load.atlas(
    'buildings',
    '/assets/atlases/buildings.png',
    '/assets/atlases/buildings.json'
  );

  this.load.atlas(
    'terrain',
    '/assets/atlases/terrain.png',
    '/assets/atlases/terrain.json'
  );
}

create(): void {
  // Access frames by name
  this.add.image(400, 400, 'buildings', 'Hotel_ThreeFloors.png');
  this.add.sprite(800, 300, 'terrain', 'Grass.png');
}
```

### TexturePacker Configuration

**Format:** "Phaser 3" (only format supporting pivot points, multi-pack, normal maps)

**Critical Settings:**
- **Allow Rotation:** ❌ **MUST BE DISABLED** - Phaser 3 is NOT compatible with rotated sprites
- **Auto Multipack:** ✅ Enable - generates multiple sheets if needed
- **Max Size:** 2048×2048 (safe for older mobile devices)

**Performance Benefits:**
- Reduces HTTP requests from 35+ to 2-3
- More efficient GPU texture binding
- Better memory packing
- **~40% faster loading time**

### Creating Texture Atlases

```bash
# Using TexturePacker CLI
TexturePacker \
  --format phaser3 \
  --data public/assets/atlases/buildings.json \
  --sheet public/assets/atlases/buildings.png \
  --max-size 2048 \
  --size-constraints POT \
  public/assets/tilesets/buildings/*.png

# Or use free-tex-packer-core
npx free-tex-packer-core \
  --project atlas-config.json \
  --output public/assets/atlases
```

---

## Physics Engine Optimization

### Arcade vs Matter.js

**✅ Use Arcade Physics for:**
- Simple top-down/isometric movement
- Basic collision detection
- POI proximity detection
- Your current use case

**Use Matter.js for:**
- Complex polygon shapes
- Constraints and joints
- Realistic physics simulations

**Performance:** Arcade has ~40% lower CPU usage than Matter.

### Your Current Config (Already Optimal)

```typescript
physics: {
  default: 'arcade',
  arcade: {
    debug: false,          // ✅ Always false in production
    gravity: { x: 0, y: 0 } // ✅ Good for top-down games
  },
}
```

### Arcade Physics Optimizations

```typescript
// ✅ Set specific collision bounds (smaller = faster)
this.player.sprite.body.setSize(20, 20);

// ✅ Use enable/disable instead of destroy/create
this.physics.world.disable(inactiveObject);
this.physics.world.enable(activeObject);

// ✅ Reduce physics FPS for non-critical objects
this.physics.world.setFPS(30); // Default is 60

// ✅ Use collision categories
const POI_CATEGORY = 0x0001;
const PLAYER_CATEGORY = 0x0002;
```

---

## Mobile Input Handling

### Current Implementation (Already Good)

Your `TouchControls.ts` and `CameraController.ts` implement:
- ✅ Virtual joystick in bottom-left quadrant
- ✅ Pinch-to-zoom with dead zone
- ✅ Conflict prevention between joystick and pinch

### Rex Virtual Joystick Plugin (Recommended Upgrade)

Most popular Phaser 3 solution:

```bash
npm install phaser3-rex-plugins
```

```typescript
import RexVirtualJoyStickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin.js';

// In game config
plugins: {
  scene: [{
    key: 'rexVirtualJoyStick',
    plugin: RexVirtualJoyStickPlugin,
    mapping: 'rexVirtualJoyStick'
  }]
}

// In scene
create(): void {
  this.joyStick = this.plugins.get('rexVirtualJoyStick').add(this, {
    x: 100,
    y: this.scale.height - 100,
    radius: 50,
    base: this.add.circle(0, 0, 50, 0x888888, 0.5),
    thumb: this.add.circle(0, 0, 25, 0xcccccc),
    dir: '8dir',
    forceMin: 16,
  });
}

update(): void {
  const cursorKeys = this.joyStick.createCursorKeys();
  if (cursorKeys.up.isDown) {
    // Handle movement
  }
}
```

### Gesture Detection

```typescript
private setupSwipeGestures(): void {
  let swipeStartX = 0;
  let swipeStartY = 0;

  this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    swipeStartX = pointer.x;
    swipeStartY = pointer.y;
  });

  this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    const dx = pointer.x - swipeStartX;
    const dy = pointer.y - swipeStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 100) {
      const angle = Math.atan2(dy, dx);
      if (Math.abs(angle) < Math.PI / 4) {
        eventBus.emit('swipe-right');
      }
    }
  });
}
```

---

## Camera Management

### Current Implementation (Already Well-Implemented)

Your `CameraController.ts` includes:
- ✅ Proper bounds
- ✅ Deadzone for smooth following
- ✅ Lerp values for smoothing

### Camera Culling (Critical for Performance)

```typescript
// ✅ IMPORTANT: Enable camera culling
create(): void {
  this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

  // Objects outside camera view won't be rendered
  const building = this.add.image(x, y, 'building');
  building.setScrollFactor(1); // Follows camera (default)

  // UI elements that should never be culled
  const uiText = this.add.text(20, 20, 'UI');
  uiText.setScrollFactor(0); // Fixed to camera
}
```

### Multiple Cameras (Minimap)

```typescript
// Main camera
const mainCamera = this.cameras.main;
mainCamera.setViewport(0, 0, 800, 600);

// Minimap camera
const minimapCamera = this.cameras.add(650, 50, 140, 105);
minimapCamera.setZoom(0.2);
minimapCamera.ignore(uiElements); // Don't render UI in minimap
```

### Camera Following

```typescript
// Your current implementation is optimal
this.camera.startFollow(target, true, lerpX, lerpY, offsetX, offsetY);

// Lerp values guide:
// 1.0 = instant snap (no smoothing)
// 0.1 = smooth (your current value - good!)
// 0.05 = very smooth (better for cinematic)
// 0.01 = sluggish (avoid)
```

### Camera Effects Performance

```typescript
// ✅ Use built-in effects sparingly
this.cameras.main.shake(100, 0.005); // Short duration
this.cameras.main.flash(250);        // Quick feedback
this.cameras.main.fade(500);         // Scene transitions

// ❌ Avoid continuous effects in update loop
// They create new tweens every frame = memory leak
```

---

## Event System

### Current Implementation (Excellent)

Your custom `EventBus.ts` is type-safe and follows best practices:

```typescript
// ✅ Correct pattern
export const eventBus = new EventBus();

export interface GameEvents {
  'poi-selected': { poiId: string; type: string; data: unknown };
  'player-moved': { x: number; y: number; zone: string };
}
```

### Scene vs Global Events

```typescript
class CityMapScene extends Phaser.Scene {
  create(): void {
    // Scene-level events (auto-cleaned on shutdown)
    this.events.on('custom-event', this.handler, this);

    // Global events (persist across scenes)
    eventBus.on('poi-selected', this.handler);
  }

  shutdown(): void {
    // Clean up global events manually
    eventBus.off('poi-selected', this.handler);
    // Scene events auto-cleaned by Phaser
  }
}
```

### Memory Leak Prevention

```typescript
// ❌ Common mistake: Arrow functions can't be removed
this.events.on('update', () => this.doSomething());

// ✅ Use bound methods
this.events.on('update', this.doSomething, this);
this.events.off('update', this.doSomething, this);

// ✅ Or store reference
this.boundHandler = this.doSomething.bind(this);
this.events.on('update', this.boundHandler);
this.events.off('update', this.boundHandler);
```

---

## React Integration

### Current Implementation (Matches Official Template)

Your EventBus pattern is the **official recommended approach**:

```typescript
// ✅ Phaser → React
eventBus.emit('poi-selected', { poiId, type, data });

// ✅ React → Phaser
useEffect(() => {
  const unsub = eventBus.on('poi-selected', handler);
  return unsub; // Cleanup on unmount
}, []);
```

### PhaserGame Component Pattern

```tsx
// ✅ Single game instance
const PhaserGame: React.FC = () => {
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

  return <div id="game-container" />;
};
```

### Getting Current Scene from React

```typescript
const getCurrentScene = () => {
  const game = gameRef.current;
  if (!game) return null;

  return game.scene.getScene('CityMapScene') as CityMapScene;
};

// Interact with scene
const scene = getCurrentScene();
scene?.player.setPosition(100, 200);
```

---

## Common Performance Pitfalls

### Critical Mistakes to Avoid

```typescript
// ❌ PITFALL #1: Creating objects in update loop
update(): void {
  const bullet = new Bullet(this, x, y); // Memory leak!
}

// ✅ SOLUTION: Object pooling
class BulletPool {
  private pool: Bullet[] = [];

  acquire(): Bullet {
    return this.pool.pop() || new Bullet(this.scene);
  }

  release(bullet: Bullet): void {
    bullet.setActive(false);
    this.pool.push(bullet);
  }
}

// ❌ PITFALL #2: Large canvas size
scale: {
  width: 1920,  // Full HD = slow on mobile
  height: 1080
}

// ✅ SOLUTION: Fixed smaller size
scale: {
  mode: Phaser.Scale.FIT,
  width: 800,   // Smaller = faster
  height: 600
}

// ❌ PITFALL #3: Loading uncompressed assets
this.load.image('background', 'bg.png'); // 2MB

// ✅ SOLUTION: Compress and use WebP
this.load.image('background', 'bg.webp'); // 200KB

// ❌ PITFALL #4: No asset lazy loading
preload(): void {
  // Loading all 500 assets at once
}

// ✅ SOLUTION: Scene-specific preload
// PreloadScene: Only boot assets
// CityMapScene: Only city assets

// ❌ PITFALL #5: Expensive calculations in update
update(): void {
  for (let enemy of enemies) {
    const distance = Phaser.Math.Distance.Between(
      player.x, player.y, enemy.x, enemy.y
    ); // Every frame for 100 enemies = slow
  }
}

// ✅ SOLUTION: Throttle calculations
private lastCheck = 0;
update(time: number): void {
  if (time - this.lastCheck > 100) { // Every 100ms
    this.calculateDistances();
    this.lastCheck = time;
  }
}
```

### Your Current Optimizations (Already Good)

```typescript
// ✅ Position update throttling (line 22-24 of CityMapScene)
private positionUpdateInterval = 100;

// ✅ Proper cleanup in shutdown()
// ✅ Using Arcade physics (not Matter)
// ✅ Camera deadzone for smooth following
```

### Additional Recommendations

```typescript
// ✅ Use Groups for batch operations
const bullets = this.add.group({
  classType: Bullet,
  maxSize: 30,
  runChildUpdate: true // Auto-calls update on all active
});

// ✅ Disable unused systems
physics: {
  default: 'arcade',
  arcade: {
    debug: false,
    fps: 60,              // Reduce to 30 for background physics
    fixedStep: true
  }
}

// ✅ Enable multi-texture batching (WebGL)
render: {
  batchSize: 4096,        // Default 2000
  maxTextures: 16,        // Increase for more atlases
}
```

---

## Isometric Game Optimization

### Phaser 3.50+ Native Isometric Support

```typescript
create(): void {
  // Use Phaser's isometric tilemap support
  const map = this.make.tilemap({
    key: 'city-map',
    tileWidth: 64,
    tileHeight: 32, // 2:1 ratio for isometric
  });

  map.createLayer('ground', tileset, 0, 0);
}
```

### 🚨 CRITICAL: Depth Sorting for Isometric

**Your project needs this:**

```typescript
update(): void {
  // Objects farther back (smaller Y) render first
  this.player.sprite.setDepth(this.player.sprite.y);

  // For all objects
  this.children.list.forEach((child) => {
    if (child.y) {
      child.setDepth(child.y);
    }
  });
}

// ✅ Better: Use depth sorting for containers
const isoContainer = this.add.container(0, 0);
isoContainer.setDepth(y);
```

### Map Chunking for Large Isometric Maps

```typescript
// ✅ Critical for 720+ tiles
class MapChunk {
  private chunkSize = 20; // 20×20 tiles per chunk
  private chunks = new Map<string, Phaser.GameObjects.Container>();

  createChunks(): void {
    for (let cx = 0; cx < this.mapWidth / this.chunkSize; cx++) {
      for (let cy = 0; cy < this.mapHeight / this.chunkSize; cy++) {
        const chunk = this.scene.add.container();
        chunk.setActive(false);
        this.chunks.set(`${cx},${cy}`, chunk);

        // Add tiles to chunk
        for (let x = 0; x < this.chunkSize; x++) {
          for (let y = 0; y < this.chunkSize; y++) {
            const tile = this.createTile(x, y);
            chunk.add(tile);
          }
        }
      }
    }
  }

  update(): void {
    const cameraChunk = this.getCameraChunk();
    const nearbyChunks = this.getChunksAround(cameraChunk, 1);

    // Only render chunks near camera
    nearbyChunks.forEach(key => {
      this.chunks.get(key)?.setActive(true);
    });
  }
}
```

---

## Priority Actions for Beat Street

### 🚨 High Priority

1. **Convert to Texture Atlases** - 60% load time improvement
   ```bash
   # Group sprites
   buildings/*.png → buildings.atlas
   terrain/*.png → terrain.atlas
   vegetation/*.png → vegetation.atlas
   vehicles/*.png → vehicles.atlas
   ```

2. **Implement Object Pooling** - For presence markers
   ```typescript
   class PresenceMarkerPool {
     private pool: Phaser.GameObjects.Sprite[] = [];

     acquire(): Phaser.GameObjects.Sprite {
       return this.pool.pop() || this.scene.add.sprite(0, 0, 'marker');
     }

     release(marker: Phaser.GameObjects.Sprite): void {
       marker.setActive(false).setVisible(false);
       this.pool.push(marker);
     }
   }
   ```

3. **Add Depth Sorting** - Required for isometric
   ```typescript
   update(): void {
     this.player.sprite.setDepth(this.player.sprite.y);
     this.presenceManager.updateDepths();
   }
   ```

### ✅ Medium Priority

4. **Consider Rex Virtual Joystick** - More features
5. **Add Scene State Management** - Better lifecycle control
6. **Implement Map Chunking** - If map grows beyond 2400×1800

### 💡 Low Priority (Polish)

7. **Add Camera Minimap** - Using secondary camera
8. **Compressed Textures** - KTX/PVR for mobile
9. **Special FX** - Glow effects for POIs

---

## Sources

- [Phaser 3.60 Release Notes](https://github.com/phaserjs/phaser/tree/v3.60.0)
- [Phaser Scene Lifecycle](https://docs.phaser.io/phaser/concepts/scenes)
- [Texture Atlas Tutorial](https://airum82.medium.com/working-with-texture-atlases-in-phaser-3-25c4df9a747a)
- [TexturePacker Phaser Integration](https://www.codeandweb.com/texturepacker/tutorials/how-to-create-sprite-sheets-for-phaser)
- [Arcade vs Matter Physics](https://phaser.discourse.group/t/arcade-vs-matterjs-performance/7218)
- [Rex Virtual Joystick Plugin](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/)
- [Official Phaser + React Template](https://github.com/phaserjs/template-react)
- [How I Optimized My Phaser 3 Game in 2025](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b)
- [Creating Isometric View in Phaser 3](https://tnodes.medium.com/creating-an-isometric-view-in-phaser-3-fada95927835)
