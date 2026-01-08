import Phaser from 'phaser';
import { InputManager } from '../systems/InputManager';
import { PlayerSpriteGenerator, Direction } from '../utils/PlayerSpriteGenerator';

export interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  inputManager?: InputManager;
  spriteKey?: string; // Optional: use a preloaded sprite texture instead of generated placeholder
  playerName?: string; // Display name for the name tag
}

export class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Text;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private inputManager?: InputManager;

  private moveSpeed = 200; // pixels per second
  private currentDirection: Direction = 's'; // Default facing south
  private isWalking = false;

  constructor(config: PlayerConfig) {
    this.scene = config.scene;
    this.inputManager = config.inputManager;

    // Determine which texture to use: preloaded sprite or default player sprite
    const textureKey = config.spriteKey || 'player';

    // Debug: Check if texture exists
    const textureExists = this.scene.textures.exists(textureKey);
    const shadowExists = this.scene.textures.exists('player-shadow');
    console.log(`[Player] Creating player at (${config.x}, ${config.y})`);
    console.log(`[Player] Texture '${textureKey}' exists: ${textureExists}`);
    console.log(`[Player] Shadow texture exists: ${shadowExists}`);

    // Create shadow (with fallback if texture doesn't exist)
    if (shadowExists) {
      this.shadow = this.scene.add.image(config.x, config.y, 'player-shadow');
    } else {
      // Create a fallback shadow as a simple ellipse
      const shadowGraphics = this.scene.add.graphics();
      shadowGraphics.fillStyle(0x000000, 0.3);
      shadowGraphics.fillEllipse(20, 8, 40, 16);
      shadowGraphics.generateTexture('player-shadow-fallback', 40, 16);
      shadowGraphics.destroy();
      this.shadow = this.scene.add.image(config.x, config.y, 'player-shadow-fallback');
      console.warn('[Player] Using fallback shadow');
    }
    this.shadow.setDepth(0); // Shadows are always at the bottom

    // Create the physics sprite (with fallback if texture doesn't exist)
    if (textureExists) {
      this.sprite = this.scene.physics.add.sprite(config.x, config.y, textureKey);
    } else {
      // Create a fallback player texture
      const fallbackGraphics = this.scene.add.graphics();
      fallbackGraphics.fillStyle(0x2A9D8F, 1); // teal
      fallbackGraphics.fillRect(0, 16, 32, 32);
      fallbackGraphics.fillStyle(0xF4A261, 1); // skin
      fallbackGraphics.fillCircle(16, 10, 10);
      fallbackGraphics.generateTexture('player-fallback', 32, 48);
      fallbackGraphics.destroy();
      this.sprite = this.scene.physics.add.sprite(config.x, config.y, 'player-fallback');
      console.warn('[Player] Using fallback player texture');
    }
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDamping(true);
    this.sprite.setDrag(0.8);
    this.sprite.setMaxVelocity(this.moveSpeed, this.moveSpeed);
    this.sprite.setDepth(10); // Player above most objects

    // Debug: Log sprite dimensions
    console.log(`[Player] Sprite size: ${this.sprite.width}x${this.sprite.height}, visible: ${this.sprite.visible}, alpha: ${this.sprite.alpha}`);

    // Start with idle animation facing south
    if (this.scene.anims.exists('player-idle-s')) {
      this.sprite.play('player-idle-s');
      console.log('[Player] Playing idle animation');
    } else {
      console.warn('[Player] Idle animation not found');
    }

    // Create name tag
    const displayName = config.playerName || 'You';
    this.nameTag = this.scene.add.text(config.x, config.y - 40, displayName, {
      fontSize: '12px',
      fontFamily: 'Source Sans 3',
      color: '#FFFFFF',
      backgroundColor: '#2C3E50',
      padding: { x: 6, y: 3 },
      resolution: 2, // Higher resolution for crisp text
    });
    this.nameTag.setOrigin(0.5, 0.5);
    this.nameTag.setDepth(100); // Name tags always on top
    this.nameTag.setAlpha(0.9);

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

    // Update animation based on movement
    this.updateAnimation(velocity.x, velocity.y);

    // Update shadow and name tag positions
    this.updateAttachments();
  }

  /**
   * Update player animation based on velocity
   */
  private updateAnimation(vx: number, vy: number): void {
    const wasWalking = this.isWalking;
    this.isWalking = Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1;

    // Update direction if moving
    if (this.isWalking) {
      const newDirection = PlayerSpriteGenerator.getDirectionFromVelocity(vx, vy);

      // Only change animation if direction changed or started walking
      if (newDirection !== this.currentDirection || !wasWalking) {
        this.currentDirection = newDirection;
        const animKey = `player-walk-${this.currentDirection}`;
        if (this.scene.anims.exists(animKey)) {
          this.sprite.play(animKey, true);
        }
      }
    } else if (wasWalking) {
      // Just stopped walking, switch to idle
      const animKey = `player-idle-${this.currentDirection}`;
      if (this.scene.anims.exists(animKey)) {
        this.sprite.play(animKey, true);
      }
    }
  }

  /**
   * Update shadow and name tag positions to follow the player
   */
  private updateAttachments(): void {
    // Shadow follows player position (slightly offset down for isometric perspective)
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);

    // Name tag floats above player
    this.nameTag.setPosition(this.sprite.x, this.sprite.y - 40);
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
    this.updateAttachments();
  }

  destroy(): void {
    this.shadow.destroy();
    this.nameTag.destroy();
    this.sprite.destroy();
  }

  isMoving(): boolean {
    return this.sprite.body
      ? Math.abs((this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x) > 0.1 ||
        Math.abs((this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y) > 0.1
      : false;
  }

  /**
   * Update the player's display name
   */
  setPlayerName(name: string): void {
    this.nameTag.setText(name);
  }

  /**
   * Get current player direction
   */
  getDirection(): Direction {
    return this.currentDirection;
  }

  /**
   * Show or hide the name tag
   */
  setNameTagVisible(visible: boolean): void {
    this.nameTag.setVisible(visible);
  }
}
