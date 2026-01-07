import Phaser from 'phaser';
import { InputManager } from '../systems/InputManager';

export interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  color?: number;
  width?: number;
  height?: number;
  inputManager?: InputManager;
}

export class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private inputManager?: InputManager;

  private moveSpeed = 200; // pixels per second
  private readonly width: number;
  private readonly height: number;

  constructor(config: PlayerConfig) {
    this.scene = config.scene;
    this.width = config.width || 32;
    this.height = config.height || 48;
    this.inputManager = config.inputManager;

    // Create a placeholder sprite using a rectangle
    // In the future, this can be replaced with an actual sprite
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(config.color || 0x2a9d8f, 1);

    // Draw an isometric-style rectangle (diamond shape for isometric perspective)
    graphics.fillRect(0, 0, this.width, this.height);

    // Add a simple character indication (head)
    graphics.fillStyle(0xf4a261, 1);
    graphics.fillCircle(this.width / 2, 12, 8);

    graphics.generateTexture('player-placeholder', this.width, this.height);
    graphics.destroy();

    // Create the physics sprite
    this.sprite = this.scene.physics.add.sprite(config.x, config.y, 'player-placeholder');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDamping(true);
    this.sprite.setDrag(0.8);
    this.sprite.setMaxVelocity(this.moveSpeed, this.moveSpeed);

    // Only setup direct keyboard input if InputManager not provided (backward compatibility)
    if (!this.inputManager) {
      this.setupInput();
    }
  }

  private setupInput(): void {
    if (!this.scene.input.keyboard) return;

    // Setup arrow keys
    this.cursors = this.scene.input.keyboard.createCursorKeys();

    // Setup WASD keys
    this.wasdKeys = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(): void {
    let velocity = new Phaser.Math.Vector2(0, 0);

    // Use InputManager if available, otherwise fall back to direct keyboard input
    if (this.inputManager) {
      const movement = this.inputManager.getMovementVector();
      velocity.x = movement.x;
      velocity.y = movement.y;
    } else {
      // Backward compatibility: direct keyboard input
      if (!this.cursors && !this.wasdKeys) return;

      // Check horizontal movement (Arrow keys + WASD)
      if (
        this.cursors?.left?.isDown ||
        this.wasdKeys?.A.isDown
      ) {
        velocity.x = -1;
      } else if (
        this.cursors?.right?.isDown ||
        this.wasdKeys?.D.isDown
      ) {
        velocity.x = 1;
      }

      // Check vertical movement (Arrow keys + WASD)
      if (
        this.cursors?.up?.isDown ||
        this.wasdKeys?.W.isDown
      ) {
        velocity.y = -1;
      } else if (
        this.cursors?.down?.isDown ||
        this.wasdKeys?.S.isDown
      ) {
        velocity.y = 1;
      }

      // Normalize diagonal movement so it's not faster
      velocity.normalize();
    }

    // Apply velocity
    this.sprite.setVelocity(
      velocity.x * this.moveSpeed,
      velocity.y * this.moveSpeed
    );
  }

  setInputManager(inputManager: InputManager): void {
    this.inputManager = inputManager;
    // Clear direct keyboard input if switching to InputManager
    this.cursors = null;
    this.wasdKeys = null;
  }

  getPosition(): { x: number; y: number } {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
    };
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
  }

  destroy(): void {
    this.sprite.destroy();
  }

  isMoving(): boolean {
    return this.sprite.body
      ? Math.abs((this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x) > 0.1 ||
        Math.abs((this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y) > 0.1
      : false;
  }
}
