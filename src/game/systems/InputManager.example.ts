/**
 * Example: How to integrate InputManager into your Phaser scene
 *
 * This shows how to replace the existing cursor-based movement
 * with the unified InputManager that supports both keyboard and touch controls.
 */

import Phaser from 'phaser';
import { InputManager } from './InputManager';

export class ExampleScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Phaser.GameObjects.Rectangle;
  private readonly playerSpeed = 200; // pixels per second

  constructor() {
    super({ key: 'ExampleScene' });
  }

  create(): void {
    // Create your player sprite
    this.player = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      32,
      32,
      0x2a9d8f
    );

    // Initialize the InputManager
    this.inputManager = new InputManager(this);

    // Optional: Check if mobile and show appropriate hints
    if (this.inputManager.isMobileDevice()) {
      console.log('Mobile device detected - touch controls active');
    }
  }

  update(_time: number, delta: number): void {
    // Get the unified movement vector (works for both keyboard and touch)
    const movement = this.inputManager.getMovementVector();

    // Apply movement to player
    if (movement.isMoving) {
      // Convert delta from milliseconds to seconds
      const deltaSeconds = delta / 1000;

      // Apply velocity
      this.player.x += movement.x * this.playerSpeed * deltaSeconds;
      this.player.y += movement.y * this.playerSpeed * deltaSeconds;
    }

    // Alternative: Using Phaser's direction vector
    // const direction = this.inputManager.getDirection();
    // this.player.x += direction.x * this.playerSpeed * (delta / 1000);
    // this.player.y += direction.y * this.playerSpeed * (delta / 1000);
  }

  shutdown(): void {
    // Clean up when scene is shut down
    if (this.inputManager) {
      this.inputManager.destroy();
    }
  }
}

/**
 * MIGRATION GUIDE:
 *
 * Old code (keyboard only):
 * -------------------------
 *
 * create(): void {
 *   this.cursors = this.input.keyboard.createCursorKeys();
 * }
 *
 * update(): void {
 *   const speed = 4;
 *   if (this.cursors?.left?.isDown) {
 *     this.player.x -= speed;
 *   } else if (this.cursors?.right?.isDown) {
 *     this.player.x += speed;
 *   }
 *   if (this.cursors?.up?.isDown) {
 *     this.player.y -= speed;
 *   } else if (this.cursors?.down?.isDown) {
 *     this.player.y += speed;
 *   }
 * }
 *
 *
 * New code (keyboard + touch):
 * ---------------------------
 *
 * create(): void {
 *   this.inputManager = new InputManager(this);
 * }
 *
 * update(time: number, delta: number): void {
 *   const movement = this.inputManager.getMovementVector();
 *   if (movement.isMoving) {
 *     const speed = 4;
 *     this.player.x += movement.x * speed;
 *     this.player.y += movement.y * speed;
 *   }
 * }
 *
 * shutdown(): void {
 *   this.inputManager?.destroy();
 * }
 */
