import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';
import { Player } from '../entities/Player';
import { CameraController } from '../systems/CameraController';
import { InputManager } from '../systems/InputManager';

export class CityMapScene extends Phaser.Scene {
  private player!: Player;
  private cameraController!: CameraController;
  private inputManager!: InputManager;
  private currentZone = 'downtown';

  // World bounds
  private readonly worldWidth = 2400;
  private readonly worldHeight = 1800;

  // Position update throttling
  private lastPositionUpdate = 0;
  private positionUpdateInterval = 100; // Update every 100ms instead of every frame

  // UI Elements
  private minimapIndicator!: Phaser.GameObjects.Rectangle;
  private zoomText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CityMapScene' });
  }

  create(): void {
    // Set world bounds for physics
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Create a larger map background with grid pattern
    this.createMapBackground();

    // Create zones/districts
    this.createDistricts();

    // Create InputManager for unified input handling (keyboard + touch)
    this.inputManager = new InputManager(this);

    // Create the player using the Player entity with InputManager
    this.player = new Player({
      scene: this,
      x: this.worldWidth / 2,
      y: this.worldHeight / 2,
      color: 0x2a9d8f,
      inputManager: this.inputManager,
    });

    // Setup camera controller
    this.cameraController = new CameraController(this, {
      camera: this.cameras.main,
      worldBounds: {
        x: 0,
        y: 0,
        width: this.worldWidth,
        height: this.worldHeight,
      },
      zoomRange: {
        min: 0.5,
        max: 2.0,
      },
      deadzone: {
        width: 100,
        height: 100,
      },
    });

    // Make camera follow player with smooth lerp
    this.cameraController.followTarget(this.player.sprite, 0.1);

    // Create UI elements (fixed to camera)
    this.createUI();

    // Add buildings and POIs
    this.createBuildings();

    // Add instructions
    this.createInstructions();
  }

  private createMapBackground(): void {
    // Main background
    this.add.rectangle(
      this.worldWidth / 2,
      this.worldHeight / 2,
      this.worldWidth,
      this.worldHeight,
      0xf0ebe0
    );

    // Create a grid pattern for visual reference
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xe0d5c0, 0.5);

    const gridSize = 100;
    for (let x = 0; x <= this.worldWidth; x += gridSize) {
      graphics.lineBetween(x, 0, x, this.worldHeight);
    }
    for (let y = 0; y <= this.worldHeight; y += gridSize) {
      graphics.lineBetween(0, y, this.worldWidth, y);
    }
  }

  private createDistricts(): void {
    // Downtown district
    this.createDistrict(200, 200, 800, 600, 0x2a9d8f, 'Downtown');

    // Cultural district
    this.createDistrict(1100, 300, 700, 500, 0xe9c46a, 'Cultural District');

    // Waterfront
    this.createDistrict(300, 1000, 1000, 400, 0x457b9d, 'Waterfront');
  }

  private createDistrict(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    name: string
  ): void {
    this.add
      .rectangle(x + width / 2, y + height / 2, width, height, color, 0.1)
      .setStrokeStyle(3, color, 0.6);

    this.add
      .text(x + width / 2, y + 30, name, {
        font: 'bold 28px Playfair Display',
        color: `#${color.toString(16).padStart(6, '0')}`,
      })
      .setOrigin(0.5);
  }

  private createBuildings(): void {
    // Convention Center - Main attraction
    const conventionCenter = this.add
      .rectangle(400, 400, 200, 150, 0x2a9d8f, 0.4)
      .setStrokeStyle(4, 0x2a9d8f)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(400, 400, 'Convention\nCenter', {
        font: 'bold 20px Source Sans 3',
        color: '#2C3E50',
        align: 'center',
      })
      .setOrigin(0.5);

    // Add hover effect
    conventionCenter.on('pointerover', () => {
      conventionCenter.setFillStyle(0x2a9d8f, 0.7);
    });

    conventionCenter.on('pointerout', () => {
      conventionCenter.setFillStyle(0x2a9d8f, 0.4);
    });

    conventionCenter.on('pointerdown', () => {
      eventBus.emit('entered-building', {
        building: 'convention-center',
        floors: [1, 2, 3],
        currentFloor: 1,
      });
      this.cameraController.fadeOut(500);
      this.time.delayedCall(500, () => {
        this.scene.start('ConventionCenterScene');
      });
    });

    // Additional buildings
    this.createBuilding(800, 300, 120, 100, 'Tech Hub', 0xe76f51);
    this.createBuilding(1200, 500, 150, 120, 'Museum', 0xe9c46a);
    this.createBuilding(600, 1100, 100, 80, 'Marina', 0x457b9d);
  }

  private createBuilding(
    x: number,
    y: number,
    width: number,
    height: number,
    name: string,
    color: number
  ): void {
    this.add
      .rectangle(x, y, width, height, color, 0.3)
      .setStrokeStyle(2, color);

    this.add
      .text(x, y, name, {
        font: '14px Source Sans 3',
        color: '#2C3E50',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private createUI(): void {
    // Title - fixed to camera
    this.add
      .text(20, 20, 'Beat Street: Pittsburgh', {
        font: 'bold 24px Playfair Display',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Zoom indicator
    this.zoomText = this.add
      .text(20, 60, 'Zoom: 1.0x', {
        font: '14px Source Sans 3',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Minimap container
    const minimapX = this.cameras.main.width - 160;
    const minimapY = 20;
    const minimapWidth = 140;
    const minimapHeight = 105;

    this.add
      .rectangle(minimapX, minimapY, minimapWidth, minimapHeight, 0xf0ebe0, 0.9)
      .setOrigin(0)
      .setStrokeStyle(2, 0x2c3e50)
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .text(minimapX + 5, minimapY + 5, 'Map', {
        font: 'bold 12px Source Sans 3',
        color: '#2C3E50',
      })
      .setScrollFactor(0)
      .setDepth(101);

    // Minimap player indicator
    this.minimapIndicator = this.add
      .rectangle(minimapX + 70, minimapY + 60, 4, 4, 0xe76f51)
      .setScrollFactor(0)
      .setDepth(101);
  }

  private createInstructions(): void {
    const isMobile = this.inputManager.isMobileDevice();
    const instructions = isMobile
      ? [
          'Touch joystick (bottom-left) - Move',
          'Pinch to zoom',
          'Tap Convention Center to enter',
        ]
      : [
          'WASD or Arrow Keys - Move',
          'Mouse Wheel / +/- - Zoom',
          'Click Convention Center to enter',
        ];

    this.add
      .text(20, this.cameras.main.height - 100, instructions.join('\n'), {
        font: '12px Source Sans 3',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 8, y: 6 },
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(time: number, _delta: number): void {
    // Update player
    this.player.update();

    // Update camera
    this.cameraController.update();

    // Update zoom display
    const zoom = this.cameraController.getZoom();
    this.zoomText.setText(`Zoom: ${zoom.toFixed(1)}x`);

    // Update minimap indicator
    const playerPos = this.player.getPosition();
    const minimapX = this.cameras.main.width - 160;
    const minimapY = 20;
    const scaleX = 140 / this.worldWidth;
    const scaleY = 105 / this.worldHeight;

    this.minimapIndicator.setPosition(
      minimapX + playerPos.x * scaleX,
      minimapY + playerPos.y * scaleY
    );

    // Throttled position updates to EventBus
    if (time - this.lastPositionUpdate > this.positionUpdateInterval) {
      eventBus.emit('player-moved', {
        x: playerPos.x,
        y: playerPos.y,
        zone: this.currentZone,
      });
      this.lastPositionUpdate = time;
    }
  }

  shutdown(): void {
    // Cleanup when scene shuts down
    if (this.player) {
      this.player.destroy();
    }

    if (this.inputManager) {
      this.inputManager.destroy();
    }
  }
}
