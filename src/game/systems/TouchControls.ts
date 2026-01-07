import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';

export interface JoystickVector {
  x: number;
  y: number;
  magnitude: number;
}

interface JoystickConfig {
  baseRadius?: number;
  thumbRadius?: number;
  maxDistance?: number;
  deadZone?: number;
  springStiffness?: number;
  springDamping?: number;
}

export class TouchControls {
  private scene: Phaser.Scene;
  private joystickBase?: Phaser.GameObjects.Graphics;
  private joystickThumb?: Phaser.GameObjects.Graphics;
  private joystickGlow?: Phaser.GameObjects.Graphics;
  private isActive = false;
  private wasActive = false; // Track previous state for haptic feedback
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private targetX = 0;
  private targetY = 0;
  private activePointer?: Phaser.Input.Pointer;

  // Configurable joystick properties
  private readonly joystickRadius: number;
  private readonly thumbRadius: number;
  private readonly maxDistance: number;
  private readonly deadZone: number;

  // Spring physics for snap-back animation
  private readonly springStiffness: number;
  private readonly springDamping: number;
  private velocityX = 0;
  private velocityY = 0;
  private isAnimatingBack = false;

  // Visual feedback properties
  private pulseTime = 0;
  private readonly pulseSpeed = 0.05;

  // Brand colors (from CLAUDE.md)
  private readonly colorTeal = 0x2a9d8f;
  private readonly colorWhite = 0xffffff;
  private readonly colorInk = 0x2c3e50;

  constructor(scene: Phaser.Scene, config: JoystickConfig = {}) {
    this.scene = scene;

    // Apply configuration with defaults
    this.joystickRadius = config.baseRadius ?? 60;
    this.thumbRadius = config.thumbRadius ?? 30;
    this.maxDistance = config.maxDistance ?? 50;
    this.deadZone = config.deadZone ?? 0.15;
    this.springStiffness = config.springStiffness ?? 0.3;
    this.springDamping = config.springDamping ?? 0.7;

    this.setupTouchListeners();
  }

  private setupTouchListeners(): void {
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // Only activate if touch is in the bottom-left quadrant
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    if (pointer.x < width / 2 && pointer.y > height / 2) {
      // Prevent multiple joysticks
      if (!this.isActive) {
        this.isActive = true;
        this.isAnimatingBack = false;
        this.activePointer = pointer;
        this.startX = pointer.x;
        this.startY = pointer.y;
        this.currentX = pointer.x;
        this.currentY = pointer.y;
        this.targetX = pointer.x;
        this.targetY = pointer.y;
        this.velocityX = 0;
        this.velocityY = 0;

        this.createJoystick();
        this.emitJoystickState(true);
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isActive && pointer.id === this.activePointer?.id) {
      this.targetX = pointer.x;
      this.targetY = pointer.y;

      // Immediate update for responsive feel
      this.currentX = pointer.x;
      this.currentY = pointer.y;
      this.updateJoystick();
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isActive && pointer.id === this.activePointer?.id) {
      this.isActive = false;
      this.activePointer = undefined;

      // Start spring animation back to center
      this.targetX = this.startX;
      this.targetY = this.startY;
      this.isAnimatingBack = true;

      this.emitJoystickState(false);
    }
  }

  private createJoystick(): void {
    // Create glow effect
    this.joystickGlow = this.scene.add.graphics();
    this.joystickGlow.setDepth(999);
    this.joystickGlow.setScrollFactor(0);
    this.joystickGlow.setPosition(this.startX, this.startY);

    // Create base circle with gradient-like effect
    this.joystickBase = this.scene.add.graphics();
    this.joystickBase.setDepth(1000);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setPosition(this.startX, this.startY);

    // Draw base with multiple layers for depth effect
    this.drawBase();

    // Create thumb circle
    this.joystickThumb = this.scene.add.graphics();
    this.joystickThumb.setDepth(1001);
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setPosition(this.startX, this.startY);

    this.drawThumb();
  }

  private drawBase(): void {
    if (!this.joystickBase) return;

    this.joystickBase.clear();

    // Outer glow ring
    this.joystickBase.lineStyle(4, this.colorTeal, 0.2);
    this.joystickBase.strokeCircle(0, 0, this.joystickRadius + 4);

    // Main base fill
    this.joystickBase.fillStyle(this.colorInk, 0.25);
    this.joystickBase.fillCircle(0, 0, this.joystickRadius);

    // Inner highlight
    this.joystickBase.lineStyle(2, this.colorWhite, 0.4);
    this.joystickBase.strokeCircle(0, 0, this.joystickRadius);

    // Direction indicators (subtle dots at cardinal points)
    const indicatorRadius = 3;
    const indicatorDistance = this.joystickRadius - 10;
    this.joystickBase.fillStyle(this.colorWhite, 0.3);

    // Top
    this.joystickBase.fillCircle(0, -indicatorDistance, indicatorRadius);
    // Right
    this.joystickBase.fillCircle(indicatorDistance, 0, indicatorRadius);
    // Bottom
    this.joystickBase.fillCircle(0, indicatorDistance, indicatorRadius);
    // Left
    this.joystickBase.fillCircle(-indicatorDistance, 0, indicatorRadius);
  }

  private drawThumb(scale = 1): void {
    if (!this.joystickThumb) return;

    this.joystickThumb.clear();

    const radius = this.thumbRadius * scale;

    // Shadow
    this.joystickThumb.fillStyle(0x000000, 0.2);
    this.joystickThumb.fillCircle(2, 2, radius);

    // Main thumb
    this.joystickThumb.fillStyle(this.colorWhite, 0.9);
    this.joystickThumb.fillCircle(0, 0, radius);

    // Teal accent ring
    this.joystickThumb.lineStyle(3, this.colorTeal, 0.9);
    this.joystickThumb.strokeCircle(0, 0, radius);

    // Inner highlight for 3D effect
    this.joystickThumb.fillStyle(this.colorWhite, 0.3);
    this.joystickThumb.fillCircle(-radius * 0.2, -radius * 0.2, radius * 0.3);
  }

  private drawGlow(): void {
    if (!this.joystickGlow) return;

    this.joystickGlow.clear();

    // Pulsing outer glow when active
    const maxPulseScale = 1.15;
    const pulseScale = 1 + Math.sin(this.pulseTime) * (maxPulseScale - 1);
    const glowRadius = (this.joystickRadius + 15) * pulseScale;

    this.joystickGlow.fillStyle(this.colorTeal, 0.1);
    this.joystickGlow.fillCircle(0, 0, glowRadius);
  }

  private updateJoystick(): void {
    if (!this.joystickThumb || !this.joystickBase) return;

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate thumb position
    let thumbX: number, thumbY: number;

    if (distance > this.maxDistance) {
      const angle = Math.atan2(dy, dx);
      thumbX = this.startX + Math.cos(angle) * this.maxDistance;
      thumbY = this.startY + Math.sin(angle) * this.maxDistance;
    } else {
      thumbX = this.currentX;
      thumbY = this.currentY;
    }

    this.joystickThumb.setPosition(thumbX, thumbY);

    // Scale thumb based on distance for visual feedback
    const normalizedDistance = Math.min(distance / this.maxDistance, 1);
    const thumbScale = 1 + normalizedDistance * 0.15;
    this.drawThumb(thumbScale);

    // Update glow
    this.drawGlow();
  }

  private hideJoystick(): void {
    this.joystickGlow?.destroy();
    this.joystickBase?.destroy();
    this.joystickThumb?.destroy();
    this.joystickGlow = undefined;
    this.joystickBase = undefined;
    this.joystickThumb = undefined;
  }

  private emitJoystickState(active: boolean): void {
    // Only emit if state changed
    if (this.wasActive !== active) {
      eventBus.emit('joystick-state', { active });
      this.wasActive = active;
    }
  }

  /**
   * Called every frame to update spring animation and visual effects
   */
  public update(delta: number): void {
    // Update pulse animation when active
    if (this.isActive) {
      this.pulseTime += this.pulseSpeed * delta;
      if (this.joystickGlow) {
        this.drawGlow();
      }
    }

    // Handle spring animation when releasing joystick
    if (this.isAnimatingBack && this.joystickThumb) {
      // Apply spring physics
      const dx = this.targetX - this.currentX;
      const dy = this.targetY - this.currentY;

      // Spring force
      const forceX = dx * this.springStiffness;
      const forceY = dy * this.springStiffness;

      // Apply force to velocity with damping
      this.velocityX = (this.velocityX + forceX) * this.springDamping;
      this.velocityY = (this.velocityY + forceY) * this.springDamping;

      // Update position
      this.currentX += this.velocityX;
      this.currentY += this.velocityY;

      // Update thumb position
      this.joystickThumb.setPosition(this.currentX, this.currentY);

      // Shrink thumb as it returns to center
      const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
      const normalizedDistance = Math.min(distanceToCenter / this.maxDistance, 1);
      this.drawThumb(1 + normalizedDistance * 0.15);

      // Check if animation is complete (close to center and low velocity)
      if (distanceToCenter < 1 && Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) {
        this.isAnimatingBack = false;
        this.hideJoystick();
      }
    }
  }

  public getVector(): JoystickVector {
    if (!this.isActive) {
      return { x: 0, y: 0, magnitude: 0 };
    }

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Apply dead zone
    if (distance < this.deadZone * this.maxDistance) {
      return { x: 0, y: 0, magnitude: 0 };
    }

    // Normalize and clamp to max distance
    const normalizedDistance = Math.min(distance / this.maxDistance, 1);
    const angle = Math.atan2(dy, dx);

    return {
      x: Math.cos(angle) * normalizedDistance,
      y: Math.sin(angle) * normalizedDistance,
      magnitude: normalizedDistance,
    };
  }

  public isJoystickActive(): boolean {
    return this.isActive;
  }

  /**
   * Check if joystick is currently animating (for preventing conflicts)
   */
  public isAnimating(): boolean {
    return this.isAnimatingBack;
  }

  /**
   * Get the current joystick center position (useful for positioning other UI)
   */
  public getJoystickPosition(): { x: number; y: number } | null {
    if (!this.isActive && !this.isAnimatingBack) {
      return null;
    }
    return { x: this.startX, y: this.startY };
  }

  public destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.hideJoystick();

    // Emit final state
    if (this.isActive) {
      this.emitJoystickState(false);
    }
  }
}
