import Phaser from 'phaser';

export interface JoystickVector {
  x: number;
  y: number;
  magnitude: number;
}

export class TouchControls {
  private scene: Phaser.Scene;
  private joystickBase?: Phaser.GameObjects.Graphics;
  private joystickThumb?: Phaser.GameObjects.Graphics;
  private isActive = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private activePointer?: Phaser.Input.Pointer;
  private readonly joystickRadius = 60;
  private readonly thumbRadius = 30;
  private readonly maxDistance = 50;
  private readonly deadZone = 0.15;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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
        this.activePointer = pointer;
        this.startX = pointer.x;
        this.startY = pointer.y;
        this.currentX = pointer.x;
        this.currentY = pointer.y;
        this.createJoystick();
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isActive && pointer.id === this.activePointer?.id) {
      this.currentX = pointer.x;
      this.currentY = pointer.y;
      this.updateJoystick();
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isActive && pointer.id === this.activePointer?.id) {
      this.isActive = false;
      this.activePointer = undefined;
      this.hideJoystick();
    }
  }

  private createJoystick(): void {
    // Create base circle
    this.joystickBase = this.scene.add.graphics();
    this.joystickBase.setDepth(1000);
    this.joystickBase.fillStyle(0x000000, 0.2);
    this.joystickBase.fillCircle(0, 0, this.joystickRadius);
    this.joystickBase.lineStyle(3, 0xffffff, 0.5);
    this.joystickBase.strokeCircle(0, 0, this.joystickRadius);
    this.joystickBase.setPosition(this.startX, this.startY);

    // Create thumb circle
    this.joystickThumb = this.scene.add.graphics();
    this.joystickThumb.setDepth(1001);
    this.joystickThumb.fillStyle(0xffffff, 0.6);
    this.joystickThumb.fillCircle(0, 0, this.thumbRadius);
    this.joystickThumb.lineStyle(2, 0x2a9d8f, 0.8);
    this.joystickThumb.strokeCircle(0, 0, this.thumbRadius);
    this.joystickThumb.setPosition(this.startX, this.startY);
  }

  private updateJoystick(): void {
    if (!this.joystickThumb || !this.joystickBase) return;

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Limit thumb to max distance
    if (distance > this.maxDistance) {
      const angle = Math.atan2(dy, dx);
      this.joystickThumb.setPosition(
        this.startX + Math.cos(angle) * this.maxDistance,
        this.startY + Math.sin(angle) * this.maxDistance
      );
    } else {
      this.joystickThumb.setPosition(this.currentX, this.currentY);
    }
  }

  private hideJoystick(): void {
    this.joystickBase?.destroy();
    this.joystickThumb?.destroy();
    this.joystickBase = undefined;
    this.joystickThumb = undefined;
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

  public destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.hideJoystick();
  }
}
