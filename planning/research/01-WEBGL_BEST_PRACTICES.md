# WebGL Game Development Best Practices (2026)

**Research Date:** January 7, 2026
**Focus:** Performance optimization for mobile and web browsers

---

## Table of Contents

1. [Performance Optimization Techniques](#performance-optimization-techniques)
2. [Memory Management](#memory-management)
3. [Texture Optimization](#texture-optimization)
4. [Common Pitfalls](#common-pitfalls)
5. [GPU vs CPU Considerations](#gpu-vs-cpu-considerations)
6. [WebGL 2 vs WebGL 1](#webgl-2-vs-webgl-1)
7. [Frame Rate Optimization](#frame-rate-optimization)
8. [Asset Loading Strategies](#asset-loading-strategies)

---

## Performance Optimization Techniques

### Mobile-Specific Challenges

- **Limited GPU Power**: Mobile GPUs are significantly less powerful than desktop
- **Memory Constraints**: iOS Safari has strict memory limitations (~50MB cache limit)
- **Browser Variation**: Android browsers show significant performance variation

### Core Optimization Strategy: Draw Call Reduction

**The single most important optimization technique.**

```javascript
// ❌ BAD: Multiple draw calls (1000× slower)
for (let i = 0; i < 1000; i++) {
  gl.bindBuffer(gl.ARRAY_BUFFER, sprites[i].vertexBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// ✅ GOOD: Single batched draw call
gl.bindBuffer(gl.ARRAY_BUFFER, combinedVertexBuffer);
gl.drawArrays(gl.TRIANGLES, 0, 6000);
```

**Target draw calls:**
- Mobile: <100 draw calls per frame
- Desktop: <1000 draw calls per frame

### Batching Techniques

**1. Texture Atlasing**
Combine multiple images into single texture to reduce texture binding:

```javascript
const atlas = {
  'player': { u: 0, v: 0, width: 64, height: 64 },
  'enemy': { u: 64, v: 0, width: 64, height: 64 },
  'building': { u: 128, v: 0, width: 64, height: 64 },
};
```

**2. Instanced Drawing (WebGL 2)**
Draw 1000 instances in one call:

```javascript
gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1000);
```

**3. Vertex Array Objects (VAOs)**
"HUGE speed up" - pre-configure vertex attributes:

```javascript
// WebGL 2 built-in VAO support
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
setupVertexAttributes(); // Do once

// Later: just bind and draw
gl.bindVertexArray(vao);
gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
```

### Shader Optimization

Do work in vertex shader (runs per vertex) rather than fragment shader (runs per pixel):

```glsl
// ✅ GOOD: Calculate lighting per vertex
// Vertex Shader
varying vec3 v_lighting;
void main() {
  v_lighting = calculateLighting(a_normal, u_lightDir);
  gl_Position = u_projection * u_view * u_model * a_position;
}

// Fragment Shader
varying vec3 v_lighting;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord) * vec4(v_lighting, 1.0);
}
```

---

## Memory Management

### Critical Principle

**WebGL does not automatically manage memory.** You must explicitly delete resources.

```javascript
function disposeObject(object) {
  // Dispose geometry
  if (object.geometry) {
    gl.deleteBuffer(object.geometry.vertexBuffer);
    gl.deleteBuffer(object.geometry.indexBuffer);
  }

  // Dispose textures
  if (object.texture) {
    gl.deleteTexture(object.texture);
  }

  // Dispose shaders
  if (object.shader) {
    gl.deleteProgram(object.shader.program);
    gl.deleteShader(object.shader.vertexShader);
    gl.deleteShader(object.shader.fragmentShader);
  }
}
```

### VRAM Budget Management

```javascript
const BYTES_PER_PIXEL_BUDGET = 16; // Adjust for target devices
const maxVRAM = window.innerWidth * window.innerHeight * BYTES_PER_PIXEL_BUDGET;

function estimateTextureMemory(width, height, format) {
  const bytesPerPixel = format === 'RGBA' ? 4 : 3;
  // Include mipmaps (30% overhead)
  return width * height * bytesPerPixel * 1.33;
}
```

### Garbage Collection Mitigation

Main performance culprit: unpredictable frame stuttering from GC.

```javascript
// ❌ BAD: Creates new objects every frame (GC pressure!)
function update() {
  const position = new Vector3(x, y, z);
  const rotation = new Quaternion(x, y, z, w);
}

// ✅ GOOD: Reuse objects
const tempVec3 = new Vector3();
const tempQuat = new Quaternion();

function update() {
  tempVec3.set(x, y, z);
  tempQuat.set(x, y, z, w);
}
```

---

## Texture Optimization

### Mipmapping

**Always use mipmaps** - only 30% memory overhead, large performance gains:

```javascript
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
gl.generateMipmap(gl.TEXTURE_2D); // Always!
```

### Texture Compression: Basis Universal

Industry standard for 2026 - **6-8× smaller GPU memory** than JPEG:

```javascript
import { BasisFile } from 'basis_universal';

async function loadBasisTexture(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  const basisFile = new BasisFile(new Uint8Array(arrayBuffer));
  basisFile.startTranscoding();

  const dstFormat = getSupportedFormat(gl);
  const textureData = basisFile.getImageTranscodedData(0, 0, dstFormat);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.compressedTexImage2D(
    gl.TEXTURE_2D, 0, getGLFormat(dstFormat),
    width, height, 0, textureData
  );

  basisFile.close();
  basisFile.delete();

  return texture;
}
```

**Compression Modes:**
- **ETC1S**: Low/medium quality, small files (best for color textures)
- **UASTC**: High quality (best for normal maps, data textures)

### Non-Power-of-2 Textures (WebGL 2)

WebGL 2 removes POT restrictions:

```javascript
// WebGL 2: No restrictions
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1920, 1080, 0,
              gl.RGBA, gl.UNSIGNED_BYTE, imageData);
```

---

## Common Pitfalls

### 1. Error Limit Awareness

After 32 errors, WebGL stops generating descriptive messages.

```javascript
function checkGLError(gl, operation) {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.error(`WebGL error after ${operation}: ${error}`);
  }
}
```

### 2. Context Loss Handling

```javascript
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  cancelAnimationFrame(animationId);
  console.log('WebGL context lost');
});

canvas.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  reinitializeWebGL();
  restoreResources();
});
```

### 3. Device Capability Assumptions

**Don't assume high limits** - minimum WebGL requirements are quite low:

```javascript
// Check actual device capabilities
const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
const maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS);

console.log(`Device supports ${maxTextureUnits} texture units`);
// Adjust shader complexity accordingly
```

### 4. Cross-Browser Testing

**Test priority (2026):**
1. Chrome/Edge (best WebGL support)
2. Firefox (excellent debugging tools)
3. Safari (conservative, iOS constraints)
4. Mobile browsers (Chrome Android, Safari iOS)

---

## GPU vs CPU Considerations

### Performance Crossover Point

- **CPU better for:** Small datasets (<1000 elements), frequent data readback
- **GPU better for:** Large datasets (>10,000 elements), parallel operations

### Minimize State Changes

Most significant bottleneck is CPU overhead from state changes:

```javascript
// ❌ BAD: High CPU overhead
for (let obj of objects) {
  gl.useProgram(obj.shader);           // State change
  gl.bindTexture(gl.TEXTURE_2D, obj.texture); // State change
  gl.drawArrays(gl.TRIANGLES, 0, obj.vertexCount);
}

// ✅ GOOD: Sort to minimize state changes
objects.sort((a, b) => a.shader - b.shader);
let currentShader = null;

for (let obj of objects) {
  if (obj.shader !== currentShader) {
    gl.useProgram(obj.shader);
    currentShader = obj.shader;
  }
  gl.drawArrays(gl.TRIANGLES, 0, obj.vertexCount);
}
```

### Avoid CPU-GPU Synchronization

Keep data on GPU as long as possible:

```javascript
// ❌ BAD: Forces CPU-GPU sync
const pixels = new Uint8Array(width * height * 4);
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

// ✅ GOOD: Process entirely on GPU
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
// Use FBO texture in next rendering pass
```

---

## WebGL 2 vs WebGL 1

### Browser Support (2026)

WebGL 2 has widespread adoption. However, some older devices only support WebGL 1.

### Key Differences

**WebGL 1 (OpenGL ES 2.0):**
- Maximum compatibility
- Power-of-2 texture restrictions
- Limited texture units (16 minimum)
- No 3D textures

**WebGL 2 (OpenGL ES 3.0):**
- Advanced rendering features
- No texture size restrictions
- VAOs built-in
- Multiple render targets
- Uniform Buffer Objects
- Integer support

### When to Use WebGL 2

**Use WebGL 2 if you need:**

1. **Vertex Array Objects (built-in)**
2. **Uniform Buffer Objects** (much faster for many uniforms)
3. **Multiple Render Targets** (deferred rendering)
4. **3D Textures / Texture Arrays** (hundreds of textures in one shader)

### Fallback Strategy

```javascript
function initWebGL(canvas) {
  const contextOptions = { antialias: true, alpha: false };

  // Try WebGL 2 first
  let gl = canvas.getContext('webgl2', contextOptions);

  if (gl) {
    console.log('Using WebGL 2');
    return { gl, version: 2 };
  }

  // Fallback to WebGL 1
  gl = canvas.getContext('webgl', contextOptions) ||
       canvas.getContext('experimental-webgl', contextOptions);

  if (gl) {
    console.log('Using WebGL 1');
    return { gl, version: 1 };
  }

  throw new Error('WebGL not supported');
}
```

**Important:** "There is no reason to use WebGL 2 if you can get by with WebGL 1."

---

## Frame Rate Optimization

### Use requestAnimationFrame

Provides screen refresh sync and automatic pausing:

```javascript
let lastTime = 0;

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);

  const deltaTime = (currentTime - lastTime) * 0.001; // Convert to seconds
  lastTime = currentTime;

  // Frame-rate independent updates
  player.position.x += player.velocity * deltaTime;

  render();
}

requestAnimationFrame(gameLoop);
```

### Frame Rate Limiting (Mobile Battery)

```javascript
const targetFPS = 30;
const frameInterval = 1000 / targetFPS;
let lastFrameTime = 0;

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);

  const elapsed = currentTime - lastFrameTime;

  if (elapsed > frameInterval) {
    lastFrameTime = currentTime - (elapsed % frameInterval);
    update(elapsed * 0.001);
    render();
  }
}
```

### FPS Measurement

```javascript
const frameTimes = [];
let fps = 60;

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);

  frameTimes.push(currentTime);
  if (frameTimes.length > 60) frameTimes.shift();

  if (frameTimes.length >= 2) {
    const totalTime = frameTimes[frameTimes.length - 1] - frameTimes[0];
    fps = Math.round((frameTimes.length - 1) / totalTime * 1000);
  }

  update();
  render();
}
```

---

## Asset Loading Strategies

### Progressive Asset Loading

```javascript
class AssetLoader {
  assets = {
    critical: [],   // Must load before game starts
    important: [],  // Load early but not blocking
    deferred: []    // Load on demand
  };

  async loadCritical() {
    const promises = this.assets.critical.map(asset => this.load(asset));
    await Promise.all(promises);
    // Can start game now
  }

  async loadImportant() {
    // Load in background
    for (const asset of this.assets.important) {
      await this.load(asset);
    }
  }

  async loadOnDemand(assetId) {
    if (!this.cache.has(assetId)) {
      const asset = await this.load(assetId);
      this.cache.set(assetId, asset);
    }
    return this.cache.get(assetId);
  }
}
```

### Level-Based Streaming

```javascript
class LevelManager {
  async loadLevel(levelId) {
    const levelData = await fetch(`/levels/${levelId}.json`).then(r => r.json());

    // Unload previous level
    if (this.currentLevel) {
      this.unloadLevelAssets(this.currentLevel);
    }

    // Load new level
    await this.loadLevelAssets(levelData);
    this.currentLevel = levelData;
  }

  unloadLevelAssets(levelData) {
    for (const assetUrl of levelData.assets) {
      if (!this.isAssetNeededElsewhere(assetUrl)) {
        this.disposeAsset(assetUrl);
        this.loadedAssets.delete(assetUrl);
      }
    }
  }
}
```

### Texture Streaming

```javascript
class TextureStreamer {
  async loadTexture(url, priority = 'normal') {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url);
    }

    // Create placeholder immediately
    const placeholder = this.createPlaceholder();
    this.textureCache.set(url, placeholder);

    // Queue actual load
    this.loadingQueue.push({ url, priority });
    this.processQueue();

    return placeholder;
  }

  createPlaceholder() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 1x1 gray pixel
    const pixel = new Uint8Array([128, 128, 128, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    return texture;
  }
}
```

---

## Recommendations for Beat Street

Based on your isometric conference navigator:

### 1. Stick with WebGL 1 via Phaser
Phaser 3.60 uses WebGL with sensible defaults. No need for WebGL 2 features.

### 2. Texture Optimization Priority
```javascript
// In PreloadScene
this.load.image('key', 'path').on('filecomplete-image-key', (key, type, texture) => {
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
});
```

### 3. Sprite Batching
```javascript
// Group by texture for batching
const playerSprites = this.add.group();
const npcSprites = this.add.group();
const poiSprites = this.add.group();
```

### 4. Mobile Performance
```javascript
// In game/config.ts
const config: Phaser.Types.Core.GameConfig = {
  render: {
    antialias: false,    // Disable on mobile
    pixelArt: true,      // Better for isometric
    roundPixels: true,   // Prevents jitter
  },
  fps: {
    target: 60,
    min: 30,             // Acceptable minimum
  },
};
```

### 5. Asset Loading Strategy
Given 720+ Penzilla sprites:
- Load critical assets only in PreloadScene
- Defer tileset loading
- Load by zone/area

---

## Sources

- [WebGL Game Development: Complete Guide to Building Browser Games](https://generalistprogrammer.com/tutorials/webgl-game-development-complete-guide-browser-games)
- [WebGL in Mobile Development: Challenges and Solutions](https://blog.pixelfreestudio.com/webgl-in-mobile-development-challenges-and-solutions/)
- [WebGL Performance | Wonderland Engine](https://wonderlandengine.com/about/webgl-performance/)
- [Best practices of optimizing game performance with WebGL](https://gamedevjs.com/articles/best-practices-of-optimizing-game-performance-with-webgl/)
- [WebGL best practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [WebGL2 from WebGL1](https://webgl2fundamentals.org/webgl/lessons/webgl1-to-webgl2.html)
- [Basis Universal WebGL README](https://github.com/BinomialLLC/basis_universal/blob/master/webgl/README.md)
