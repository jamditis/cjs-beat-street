import Phaser from 'phaser';
import { TouchControls, JoystickVector } from './TouchControls';

export interface MovementVector {
  x: number;
  y: number;
  isMoving: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private touchControls: TouchControls;
  private isMobile: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.isMobile = this.detectMobile();
    this.touchControls = new TouchControls(scene);

    // Setup keyboard controls (works on desktop and mobile with keyboard)
    this.setupKeyboardControls();
  }

  private detectMobile(): boolean {
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Check user agent for mobile devices
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUA = mobileRegex.test(navigator.userAgent);

    // Check screen size (consider tablets as mobile)
    const isSmallScreen = window.innerWidth < 1024;

    return hasTouch && (isMobileUA || isSmallScreen);
  }

  private setupKeyboardControls(): void {
    if (!this.scene.input.keyboard) return;

    // Arrow keys
    this.cursors = this.scene.input.keyboard.createCursorKeys();

    // WASD keys
    this.wasdKeys = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private getKeyboardVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // Check arrow keys
    if (this.cursors?.left?.isDown) x -= 1;
    if (this.cursors?.right?.isDown) x += 1;
    if (this.cursors?.up?.isDown) y -= 1;
    if (this.cursors?.down?.isDown) y += 1;

    // Check WASD keys
    if (this.wasdKeys?.A?.isDown) x -= 1;
    if (this.wasdKeys?.D?.isDown) x += 1;
    if (this.wasdKeys?.W?.isDown) y -= 1;
    if (this.wasdKeys?.S?.isDown) y += 1;

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    return { x, y };
  }

  public getMovementVector(): MovementVector {
    // Get keyboard input
    const keyboardInput = this.getKeyboardVector();

    // Get touch input
    const touchInput: JoystickVector = this.touchControls.getVector();

    // Combine inputs (touch takes priority if active)
    let x = keyboardInput.x;
    let y = keyboardInput.y;

    if (touchInput.magnitude > 0) {
      x = touchInput.x;
      y = touchInput.y;
    }

    const isMoving = x !== 0 || y !== 0;

    return { x, y, isMoving };
  }

  public getDirection(): Phaser.Math.Vector2 {
    const movement = this.getMovementVector();
    return new Phaser.Math.Vector2(movement.x, movement.y);
  }

  public isMoving(): boolean {
    return this.getMovementVector().isMoving;
  }

  public isMobileDevice(): boolean {
    return this.isMobile;
  }

  public getTouchControls(): TouchControls {
    return this.touchControls;
  }

  public destroy(): void {
    this.touchControls.destroy();
  }
}
