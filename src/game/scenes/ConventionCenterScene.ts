import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';
import { Player } from '../entities/Player';
import { CameraController } from '../systems/CameraController';
import { InputManager } from '../systems/InputManager';
import { POIManager } from '../systems/POIManager';
import { PresenceManager } from '../systems/PresenceManager';
import { POIType, POIData } from '../../types/poi';

export class ConventionCenterScene extends Phaser.Scene {
  private player!: Player;
  private cameraController!: CameraController;
  private inputManager!: InputManager;
  private poiManager!: POIManager;
  private presenceManager!: PresenceManager;
  private currentFloor = 1;

  // World bounds
  private readonly worldWidth = 1600;
  private readonly worldHeight = 1200;

  // UI Elements
  private floorText!: Phaser.GameObjects.Text;

  // Floor transition
  private isTransitioning = false;

  // Event listener cleanup
  private unsubscribeSwitchFloor: (() => void) | null = null;
  private unsubscribeActionButton: (() => void) | null = null;
  private unsubscribeNavigateToPOI: (() => void) | null = null;

  constructor() {
    super({ key: 'ConventionCenterScene' });
  }

  create(): void {
    // Set world bounds for physics
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Create interior background
    this.createInteriorBackground();

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
        min: 0.7,
        max: 2.0,
      },
      deadzone: {
        width: 80,
        height: 80,
      },
    });

    // Make camera follow player
    this.cameraController.followTarget(this.player.sprite, 0.12);

    // Fade in camera
    this.cameraController.fadeIn(500);

    // Initialize POIManager
    this.poiManager = new POIManager({
      scene: this,
      showLabels: true,
      showDistances: false,
    });

    // Initialize PresenceManager for attendee markers
    // Enabled state is controlled via EventBus events (toggle-attendee-markers)
    // when user grants/revokes location sharing consent
    this.presenceManager = new PresenceManager({
      scene: this,
      enabled: this.getLocationConsentFromStorage(),
      maxVisibleMarkers: 50,
      clusterDistance: 80,
    });

    // Create UI elements
    this.createUI();

    // Create rooms and POIs for the current floor
    this.createFloorLayout(this.currentFloor);

    // Listen for floor change events from React
    this.unsubscribeSwitchFloor = eventBus.on('switch-floor', this.handleFloorChange.bind(this));

    // Add instructions
    this.createInstructions();

    // Setup event handlers for action button and navigation
    this.setupEventHandlers();
  }

  private createInteriorBackground(): void {
    // Main background
    this.add.rectangle(
      this.worldWidth / 2,
      this.worldHeight / 2,
      this.worldWidth,
      this.worldHeight,
      0xfaf8f5
    );

    // Create a floor tile pattern
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xe8e0d5, 0.4);

    const tileSize = 80;
    for (let x = 0; x <= this.worldWidth; x += tileSize) {
      graphics.lineBetween(x, 0, x, this.worldHeight);
    }
    for (let y = 0; y <= this.worldHeight; y += tileSize) {
      graphics.lineBetween(0, y, this.worldWidth, y);
    }
  }

  private createUI(): void {
    // Floor indicator - fixed to camera
    this.floorText = this.add
      .text(20, 20, `Convention Center - Floor ${this.currentFloor}`, {
        font: 'bold 22px Playfair Display',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Exit button
    const exitBtn = this.add
      .rectangle(20, 70, 100, 40, 0x2a9d8f)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.add
      .text(70, 90, 'Exit', {
        font: 'bold 16px Source Sans 3',
        color: '#FFFFFF',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    // Exit button hover effect
    exitBtn.on('pointerover', () => {
      exitBtn.setFillStyle(0x238276);
    });

    exitBtn.on('pointerout', () => {
      exitBtn.setFillStyle(0x2a9d8f);
    });

    exitBtn.on('pointerdown', () => {
      eventBus.emit('exited-building', {});
      this.cameraController.fadeOut(500);
      this.time.delayedCall(500, () => {
        this.scene.start('CityMapScene');
      });
    });

    // POI info panel (initially hidden)
    this.createPOIInfoPanel();
  }

  private createPOIInfoPanel(): void {
    // Will be used to show details when hovering over POIs
    const panelWidth = 250;
    const panelHeight = 80;
    const panelX = this.cameras.main.width / 2 - panelWidth / 2;
    const panelY = this.cameras.main.height - panelHeight - 20;

    const panel = this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x2c3e50, 0.9)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(99)
      .setVisible(false);

    panel.setName('poi-info-panel');
  }

  private createInstructions(): void {
    const isMobile = this.inputManager.isMobileDevice();
    const instructions = isMobile
      ? [
          'Touch joystick (bottom-left) - Move',
          'Pinch to zoom',
          'Tap POIs or use action button',
        ]
      : [
          'WASD or Arrow Keys - Move',
          'Mouse Wheel / +/- - Zoom',
          'E or Space - Interact with nearby POI',
        ];

    this.add
      .text(20, this.cameras.main.height - 90, instructions.join('\n'), {
        font: '12px Source Sans 3',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 8, y: 6 },
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  private createFloorLayout(floor: number): void {
    // Clear existing POIs via POIManager
    this.poiManager.clearAll();

    // Create rooms based on floor
    switch (floor) {
      case 1:
        this.createRoom(200, 200, 400, 300, 'Main Hall', 0x2a9d8f);
        this.createRoom(700, 200, 300, 200, 'Registration', 0xe9c46a);
        this.createRoom(1100, 200, 300, 300, 'Exhibit Hall A', 0xf4a261);

        // POIs for Floor 1
        this.registerPOI('main-stage', 400, 350, 'Main Stage', POIType.SESSION, 1);
        this.registerPOI('check-in-desk', 850, 300, 'Check-in Desk', POIType.INFO, 1);
        this.registerPOI('sponsor-booth-a', 1250, 350, 'Sponsor Booth A', POIType.SPONSOR, 1);
        this.registerPOI('coffee-bar', 400, 600, 'Coffee Bar', POIType.FOOD, 1);
        break;

      case 2:
        this.createRoom(200, 200, 350, 350, 'Breakout Room A', 0x457b9d);
        this.createRoom(650, 200, 350, 350, 'Breakout Room B', 0x2a9d8f);
        this.createRoom(1100, 200, 300, 350, 'Networking Lounge', 0xe9c46a);

        // POIs for Floor 2
        this.registerPOI('workshop-2a', 375, 375, 'Workshop 2A', POIType.SESSION, 2);
        this.registerPOI('workshop-2b', 825, 375, 'Workshop 2B', POIType.SESSION, 2);
        this.registerPOI('lounge-seating', 1250, 375, 'Lounge Seating', POIType.SOCIAL, 2);
        this.registerPOI('refreshments', 500, 700, 'Refreshments', POIType.FOOD, 2);
        break;

      case 3:
        this.createRoom(200, 200, 500, 400, 'Conference Hall', 0x2a9d8f);
        this.createRoom(800, 200, 300, 250, 'VIP Lounge', 0xe76f51);
        this.createRoom(1150, 200, 250, 250, 'Green Room', 0xe9c46a);

        // POIs for Floor 3
        this.registerPOI('keynote-stage', 450, 400, 'Keynote Stage', POIType.SESSION, 3);
        this.registerPOI('vip-area', 950, 325, 'VIP Area', POIType.SOCIAL, 3);
        this.registerPOI('speaker-prep', 1275, 325, 'Speaker Prep', POIType.INFO, 3);
        break;
    }
  }

  private createRoom(
    x: number,
    y: number,
    width: number,
    height: number,
    name: string,
    color: number
  ): void {
    // Room background
    this.add
      .rectangle(x + width / 2, y + height / 2, width, height, color, 0.15)
      .setStrokeStyle(3, color, 0.8);

    // Room label
    this.add
      .text(x + width / 2, y + 20, name, {
        font: 'bold 18px Playfair Display',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(1);
  }

  /**
   * Register a POI with the POIManager
   */
  private registerPOI(
    id: string,
    x: number,
    y: number,
    name: string,
    type: POIType,
    floor: number
  ): void {
    const poiData: POIData = {
      id,
      type,
      name,
      position: { x, y, floor, zone: 'convention-center' },
      floor,
      isActive: true,
      isPulsing: false,
    };

    this.poiManager.registerPOI(poiData);
  }

  private handleFloorChange(floor: unknown): void {
    if (typeof floor === 'number' && !this.isTransitioning) {
      this.isTransitioning = true;
      this.currentFloor = floor;

      // Animate floor transition
      this.cameraController.fadeOut(300);

      this.time.delayedCall(300, () => {
        // Update floor text
        this.floorText.setText(`Convention Center - Floor ${this.currentFloor}`);

        // Recreate floor layout
        this.createFloorLayout(this.currentFloor);

        // Reset player position
        this.player.setPosition(this.worldWidth / 2, this.worldHeight / 2);

        // Fade back in
        this.cameraController.fadeIn(300);

        this.time.delayedCall(300, () => {
          this.isTransitioning = false;
          eventBus.emit('floor-changed', { floor: this.currentFloor });
        });
      });
    }
  }

  update(time: number, _delta: number): void {
    // Update player
    this.player.update();

    // Update camera
    this.cameraController.update();

    // Update presence markers
    this.presenceManager.update(time);
  }

  private getLocationConsentFromStorage(): boolean {
    const consent = localStorage.getItem('location-consent');
    return consent === 'true';
  }

  /**
   * Setup event handlers for action button and POI navigation
   */
  private setupEventHandlers(): void {
    // Handle action button press (mobile) or keyboard interact (desktop)
    this.unsubscribeActionButton = eventBus.on('action-button-pressed', this.handleActionButton.bind(this));

    // Handle navigation to POI request
    this.unsubscribeNavigateToPOI = eventBus.on('navigate-to-poi', this.handleNavigateToPOI.bind(this));
  }

  /**
   * Handle action button press - interact with nearest POI
   */
  private handleActionButton(): void {
    const playerPos = this.player.getPosition();
    const interactionRadius = 150; // Max distance to interact with a POI

    // Find the closest POI within interaction radius
    const closestPOI = this.poiManager.getClosestPOI(playerPos.x, playerPos.y);

    if (closestPOI) {
      const distance = closestPOI.getDistanceTo(playerPos.x, playerPos.y);

      if (distance <= interactionRadius) {
        // Trigger the POI click event (same as clicking on it)
        eventBus.emit('poi-selected', {
          poiId: closestPOI.data.id,
          type: closestPOI.data.type,
          data: closestPOI.data,
        });
      }
    }
  }

  /**
   * Handle navigation to a POI - move player towards the POI position
   */
  private handleNavigateToPOI(data: unknown): void {
    const navData = data as { poiId: string; position: { x: number; y: number } };

    if (navData && navData.position) {
      const { x, y } = navData.position;

      // Move player to POI position
      this.player.setPosition(x, y);

      // Close the POI panel
      eventBus.emit('poi-panel-close', {});
    }
  }

  shutdown(): void {
    // Cleanup EventBus subscriptions
    if (this.unsubscribeSwitchFloor) {
      this.unsubscribeSwitchFloor();
      this.unsubscribeSwitchFloor = null;
    }
    if (this.unsubscribeActionButton) {
      this.unsubscribeActionButton();
      this.unsubscribeActionButton = null;
    }
    if (this.unsubscribeNavigateToPOI) {
      this.unsubscribeNavigateToPOI();
      this.unsubscribeNavigateToPOI = null;
    }

    // Cleanup CameraController
    if (this.cameraController) {
      this.cameraController.destroy();
    }

    if (this.poiManager) {
      this.poiManager.destroy();
    }

    if (this.presenceManager) {
      this.presenceManager.destroy();
    }

    if (this.player) {
      this.player.destroy();
    }

    if (this.inputManager) {
      this.inputManager.destroy();
    }
  }
}
