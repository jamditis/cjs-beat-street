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
  private wasActive = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private targetX = 0;
  private targetY = 0;
  private activePointer?: Phaser.Input.Pointer;

  private readonly joystickRadius: number;
  private readonly thumbRadius: number;
  private readonly maxDistance: number;
  private readonly deadZone: number;

  private readonly springStiffness: number;
  private readonly springDamping: number;
  private velocityX = 0;
  private velocityY = 0;
  private isAnimatingBack = false;

  private pulseTime = 0;
  private readonly pulseSpeed = 0.05;

  private readonly colorTeal = 0x2a9d8f;
  private readonly colorWhite = 0xffffff;
  private readonly colorInk = 0x2c3e50;

  constructor(scene: Phaser.Scene, config: JoystickConfig = {}) {
    this.scene = scene;

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
    const width = this.scene.scale.width || window.innerWidth || 800;
    const height = this.scene.scale.height || window.innerHeight || 600;

    if (pointer.x < width / 2 && pointer.y > height / 2) {
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

      this.currentX = pointer.x;
      this.currentY = pointer.y;
      this.updateJoystick();
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isActive && pointer.id === this.activePointer?.id) {
      this.isActive = false;
      this.activePointer = undefined;

      this.targetX = this.startX;
      this.targetY = this.startY;
      this.isAnimatingBack = true;

      this.emitJoystickState(false);
    }
  }

  private createJoystick(): void {
    this.joystickGlow = this.scene.add.graphics();
    this.joystickGlow.setDepth(999);
    this.joystickGlow.setScrollFactor(0);
    this.joystickGlow.setPosition(this.startX, this.startY);

    this.joystickBase = this.scene.add.graphics();
    this.joystickBase.setDepth(1000);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setPosition(this.startX, this.startY);

    this.drawBase();

    this.joystickThumb = this.scene.add.graphics();
    this.joystickThumb.setDepth(1001);
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setPosition(this.startX, this.startY);

    this.drawThumb();
  }

  private drawBase(): void {
    if (!this.joystickBase) return;

    this.joystickBase.clear();

    this.joystickBase.lineStyle(4, this.colorTeal, 0.2);
    this.joystickBase.strokeCircle(0, 0, this.joystickRadius + 4);

    this.joystickBase.fillStyle(this.colorInk, 0.25);
    this.joystickBase.fillCircle(0, 0, this.joystickRadius);

    this.joystickBase.lineStyle(2, this.colorWhite, 0.4);
    this.joystickBase.strokeCircle(0, 0, this.joystickRadius);

    const indicatorRadius = 3;
    const indicatorDistance = this.joystickRadius - 10;
    this.joystickBase.fillStyle(this.colorWhite, 0.3);
    this.joystickBase.fillCircle(0, -indicatorDistance, indicatorRadius);
    this.joystickBase.fillCircle(indicatorDistance, 0, indicatorRadius);
    this.joystickBase.fillCircle(0, indicatorDistance, indicatorRadius);
    this.joystickBase.fillCircle(-indicatorDistance, 0, indicatorRadius);
  }

  private drawThumb(scale = 1): void {
    if (!this.joystickThumb) return;

    this.joystickThumb.clear();

    const radius = this.thumbRadius * scale;

    this.joystickThumb.fillStyle(0x000000, 0.2);
    this.joystickThumb.fillCircle(2, 2, radius);

    this.joystickThumb.fillStyle(this.colorWhite, 0.9);
    this.joystickThumb.fillCircle(0, 0, radius);

    this.joystickThumb.lineStyle(3, this.colorTeal, 0.9);
    this.joystickThumb.strokeCircle(0, 0, radius);

    this.joystickThumb.fillStyle(this.colorWhite, 0.3);
    this.joystickThumb.fillCircle(-radius * 0.2, -radius * 0.2, radius * 0.3);
  }

  private drawGlow(): void {
    if (!this.joystickGlow) return;

    this.joystickGlow.clear();

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

    const normalizedDistance = Math.min(distance / this.maxDistance, 1);
    const thumbScale = 1 + normalizedDistance * 0.15;
    this.drawThumb(thumbScale);

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
    if (this.wasActive !== active) {
      eventBus.emit('joystick-state', { active });
      this.wasActive = active;
    }
  }

  public update(delta: number): void {
    if (this.isActive) {
      this.pulseTime += this.pulseSpeed * delta;
      if (this.joystickGlow) {
        this.drawGlow();
      }
    }

    if (this.isAnimatingBack && this.joystickThumb) {
      const dx = this.targetX - this.currentX;
      const dy = this.targetY - this.currentY;

      const forceX = dx * this.springStiffness;
      const forceY = dy * this.springStiffness;

      this.velocityX = (this.velocityX + forceX) * this.springDamping;
      this.velocityY = (this.velocityY + forceY) * this.springDamping;

      this.currentX += this.velocityX;
      this.currentY += this.velocityY;

      this.joystickThumb.setPosition(this.currentX, this.currentY);

      const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
      const normalizedDistance = Math.min(distanceToCenter / this.maxDistance, 1);
      this.drawThumb(1 + normalizedDistance * 0.15);

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

    if (distance < this.deadZone * this.maxDistance) {
      return { x: 0, y: 0, magnitude: 0 };
    }

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

  public isAnimating(): boolean {
    return this.isAnimatingBack;
  }

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

    if (this.isActive) {
      this.emitJoystickState(false);
    }
  }
}
