import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';
import { Player } from '../entities/Player';
import { CameraController } from '../systems/CameraController';
import { InputManager } from '../systems/InputManager';
import { POIManager } from '../systems/POIManager';
import { PresenceManager } from '../systems/PresenceManager';
import { POIType, POIData } from '../../types/poi';
import { VenueId, IndoorVenueConfig, FloorConfig } from '../../types/venue';
import { getIndoorVenueConfig, getFloorConfig } from '../../config/venues';

/**
 * Scene data passed when starting the ConventionCenterScene
 */
export interface ConventionCenterSceneData {
  venueId: VenueId;
  indoorVenueId: string;
  floor?: number;
}

export class ConventionCenterScene extends Phaser.Scene {
  private player!: Player;
  private cameraController!: CameraController;
  private inputManager!: InputManager;
  private poiManager!: POIManager;
  private presenceManager!: PresenceManager;
  private currentFloor = 1;

  // Venue configuration
  private currentVenueId!: VenueId;
  private currentIndoorVenueId!: string;
  private indoorVenueConfig!: IndoorVenueConfig;
  private floorConfig!: FloorConfig;

  // World bounds (updated from floor config)
  private worldWidth = 1600;
  private worldHeight = 1200;

  // UI Elements (fixed to viewport, not affected by camera zoom)
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiElements: Phaser.GameObjects.GameObject[] = [];
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

  /**
   * Initialize scene with venue and floor configuration
   */
  init(data: ConventionCenterSceneData): void {
    this.currentVenueId = data.venueId;
    this.currentIndoorVenueId = data.indoorVenueId;
    this.currentFloor = data.floor || 1;

    const config = getIndoorVenueConfig(this.currentVenueId, this.currentIndoorVenueId);
    if (!config) {
      throw new Error(`Indoor venue not found: ${this.currentIndoorVenueId}`);
    }
    this.indoorVenueConfig = config;

    const floorConfig = config.floors.find(f => f.floor === this.currentFloor);
    if (!floorConfig) {
      throw new Error(`Floor ${this.currentFloor} not found`);
    }
    this.floorConfig = floorConfig;

    this.worldWidth = floorConfig.worldBounds.width;
    this.worldHeight = floorConfig.worldBounds.height;
  }

  create(): void {
    // Set world bounds for physics
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Create interior background
    this.createInteriorBackground();

    // Create InputManager for unified input handling (keyboard + touch)
    this.inputManager = new InputManager(this);

    // Get player display name from localStorage
    const playerName = this.getPlayerDisplayName();

    // Create the player using the Player entity with InputManager
    this.player = new Player({
      scene: this,
      x: this.floorConfig.spawnPoint.x,
      y: this.floorConfig.spawnPoint.y,
      inputManager: this.inputManager,
      playerName,
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

    // Create a separate UI camera that doesn't zoom
    // This ensures HUD elements stay fixed to the viewport
    const cameraWidth = this.cameras.main.width || window.innerWidth || 800;
    const cameraHeight = this.cameras.main.height || window.innerHeight || 600;
    this.uiCamera = this.cameras.add(0, 0, cameraWidth, cameraHeight);
    this.uiCamera.setScroll(0, 0);

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

    // Emit entered-building event with venue information
    eventBus.emit('entered-building', {
      venueId: this.currentVenueId,
      indoorVenueId: this.currentIndoorVenueId,
      floor: this.currentFloor,
      displayName: this.indoorVenueConfig.displayName,
      totalFloors: this.indoorVenueConfig.floors.length,
    });
  }

  private createInteriorBackground(): void {
    // Main background - warm cream color for indoor flooring
    this.add.rectangle(
      this.worldWidth / 2,
      this.worldHeight / 2,
      this.worldWidth,
      this.worldHeight,
      0xf5f2eb
    );

    // Create a subtle floor tile pattern (very light, like polished floor)
    const graphics = this.add.graphics();

    // Very subtle tile lines
    graphics.lineStyle(1, 0xe5dfd5, 0.2);

    const tileSize = 120;
    for (let x = 0; x <= this.worldWidth; x += tileSize) {
      graphics.lineBetween(x, 0, x, this.worldHeight);
    }
    for (let y = 0; y <= this.worldHeight; y += tileSize) {
      graphics.lineBetween(0, y, this.worldWidth, y);
    }

    // Add subtle floor texture variation
    this.createFloorTexture();

    // Add building walls/borders
    this.createWalls();
  }

  /**
   * Create subtle floor texture variations
   */
  private createFloorTexture(): void {
    const graphics = this.add.graphics();
    graphics.setDepth(-1);

    // Subtle alternating tile shading
    const tileSize = 120;
    for (let row = 0; row < Math.ceil(this.worldHeight / tileSize); row++) {
      for (let col = 0; col < Math.ceil(this.worldWidth / tileSize); col++) {
        if ((row + col) % 2 === 0) {
          graphics.fillStyle(0xfaf7f0, 0.3);
          graphics.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
      }
    }
  }

  /**
   * Create building walls and structural elements
   */
  private createWalls(): void {
    const graphics = this.add.graphics();
    graphics.setDepth(0);

    // Outer wall border
    graphics.lineStyle(8, 0x8b7355, 0.6);
    graphics.strokeRect(20, 20, this.worldWidth - 40, this.worldHeight - 40);

    // Inner shadow effect for depth
    graphics.lineStyle(3, 0xa08060, 0.3);
    graphics.strokeRect(28, 28, this.worldWidth - 56, this.worldHeight - 56);

    // Add corner pillars for architectural detail
    const pillarSize = 40;
    const pillarColor = 0x9b8575;
    const corners = [
      { x: 40, y: 40 },
      { x: this.worldWidth - 40, y: 40 },
      { x: 40, y: this.worldHeight - 40 },
      { x: this.worldWidth - 40, y: this.worldHeight - 40 },
    ];

    corners.forEach(({ x, y }) => {
      this.add.rectangle(x, y, pillarSize, pillarSize, pillarColor, 0.3)
        .setDepth(1);
    });
  }

  private createUI(): void {
    // Floor indicator - fixed to viewport
    this.floorText = this.add
      .text(20, 20, `${this.indoorVenueConfig.displayName} - Floor ${this.currentFloor}`, {
        font: 'bold 22px Playfair Display',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.uiElements.push(this.floorText);

    // Exit button
    const exitBtn = this.add
      .rectangle(20, 70, 100, 40, 0x2a9d8f)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);
    this.uiElements.push(exitBtn);

    const exitLabel = this.add
      .text(70, 90, 'Exit', {
        font: 'bold 16px Source Sans 3',
        color: '#FFFFFF',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
    this.uiElements.push(exitLabel);

    // Exit button hover effect
    exitBtn.on('pointerover', () => {
      exitBtn.setFillStyle(0x238276);
    });

    exitBtn.on('pointerout', () => {
      exitBtn.setFillStyle(0x2a9d8f);
    });

    exitBtn.on('pointerdown', () => {
      this.exitBuilding();
    });

    // POI info panel (initially hidden)
    this.createPOIInfoPanel();
  }

  private createPOIInfoPanel(): void {
    // Will be used to show details when hovering over POIs
    const screenWidth = this.cameras.main.width || window.innerWidth || 800;
    const screenHeight = this.cameras.main.height || window.innerHeight || 600;
    const panelWidth = 250;
    const panelHeight = 80;
    const panelX = screenWidth / 2 - panelWidth / 2;
    const panelY = screenHeight - panelHeight - 20;

    const panel = this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x2c3e50, 0.9)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(99)
      .setVisible(false);

    panel.setName('poi-info-panel');
    this.uiElements.push(panel);
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

    const screenHeight = this.cameras.main.height || window.innerHeight || 600;
    const instructionsText = this.add
      .text(20, Math.max(100, screenHeight - 90), instructions.join('\n'), {
        font: '12px Source Sans 3',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 8, y: 6 },
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.uiElements.push(instructionsText);

    // Configure cameras after all UI elements are created
    // Main camera ignores UI elements, UI camera renders them at fixed position
    this.cameras.main.ignore(this.uiElements);
  }

  private createFloorLayout(_floor: number): void {
    // Clear existing POIs via POIManager
    this.poiManager.clearAll();

    // Create rooms from floor configuration
    const rooms = this.floorConfig.rooms || [];
    for (const room of rooms) {
      this.createRoom(
        room.bounds.x,
        room.bounds.y,
        room.bounds.width,
        room.bounds.height,
        room.name,
        room.color
      );

      // Register a POI at the center of each room
      const poiType = this.getRoomPOIType(room.type);
      const centerX = room.bounds.x + room.bounds.width / 2;
      const centerY = room.bounds.y + room.bounds.height / 2;
      this.registerPOI(
        room.id,
        centerX,
        centerY,
        room.name,
        poiType,
        this.currentFloor
      );
    }
  }

  /**
   * Map room type to POI type
   */
  private getRoomPOIType(roomType?: string): POIType {
    switch (roomType) {
      case 'session':
        return POIType.SESSION;
      case 'exhibit':
        return POIType.SPONSOR;
      case 'networking':
        return POIType.SOCIAL;
      case 'food':
        return POIType.FOOD;
      case 'service':
        return POIType.INFO;
      default:
        return POIType.INFO;
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
      // Get the new floor config
      const newFloorConfig = getFloorConfig(
        this.currentVenueId,
        this.currentIndoorVenueId,
        floor
      );
      if (!newFloorConfig) {
        console.warn(`Floor ${floor} not found for venue ${this.currentIndoorVenueId}`);
        return;
      }

      this.isTransitioning = true;
      this.currentFloor = floor;
      this.floorConfig = newFloorConfig;

      // Update world bounds
      this.worldWidth = newFloorConfig.worldBounds.width;
      this.worldHeight = newFloorConfig.worldBounds.height;

      // Animate floor transition
      this.cameraController.fadeOut(300);

      this.time.delayedCall(300, () => {
        // Update physics world bounds
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Update floor text
        this.floorText.setText(`${this.indoorVenueConfig.displayName} - Floor ${this.currentFloor}`);

        // Recreate floor layout
        this.createFloorLayout(this.currentFloor);

        // Reset player position to floor spawn point
        this.player.setPosition(
          this.floorConfig.spawnPoint.x,
          this.floorConfig.spawnPoint.y
        );

        // Update camera bounds
        this.cameraController.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Fade back in
        this.cameraController.fadeIn(300);

        this.time.delayedCall(300, () => {
          this.isTransitioning = false;
          eventBus.emit('floor-changed', {
            floor: this.currentFloor,
            venueId: this.currentVenueId,
            indoorVenueId: this.currentIndoorVenueId,
          });
        });
      });
    }
  }

  /**
   * Exit the building and return to the outdoor map
   */
  private exitBuilding(): void {
    eventBus.emit('exited-building', { venueId: this.currentVenueId });
    this.cameraController.fadeOut(500);
    this.time.delayedCall(500, () => {
      this.scene.start('CityMapScene', { venueId: this.currentVenueId });
    });
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

  /**
   * Get player display name from localStorage
   */
  private getPlayerDisplayName(): string {
    try {
      const stored = localStorage.getItem('beat-street-attendee');
      if (stored) {
        const data = JSON.parse(stored);
        return data.displayName || 'You';
      }
    } catch (error) {
      console.warn('[ConventionCenterScene] Failed to get player display name:', error);
    }
    return 'You';
  }
}
