import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';
import { Player } from '../entities/Player';
import { CameraController } from '../systems/CameraController';
import { InputManager } from '../systems/InputManager';
import { PresenceManager } from '../systems/PresenceManager';
import { POIManager } from '../systems/POIManager';
import { POIType, POIData } from '../../types/poi';
import { VenueId, VenueConfig } from '../../types/venue';
import { getVenueConfig, getDefaultVenue } from '../../config/venues';

/**
 * Scene initialization data for CityMapScene
 */
export interface CityMapSceneData {
  venueId?: VenueId;
}

export class CityMapScene extends Phaser.Scene {
  private player!: Player;
  private cameraController!: CameraController;
  private inputManager!: InputManager;
  private presenceManager!: PresenceManager;
  private poiManager!: POIManager;
  private currentZone = 'outdoor';

  // Venue configuration (data-driven)
  private currentVenueId!: VenueId;
  private venueConfig!: VenueConfig;

  // World bounds (set from venue config in init)
  private worldWidth = 2400;
  private worldHeight = 1800;

  // Position update throttling
  private lastPositionUpdate = 0;
  private positionUpdateInterval = 100; // Update every 100ms instead of every frame

  // UI Elements
  private minimapIndicator!: Phaser.GameObjects.Rectangle;
  private zoomText!: Phaser.GameObjects.Text;

  // Event listener cleanup (initialized in setupEventHandlers, used in shutdown)
  private unsubscribeActionButton!: () => void;
  private unsubscribeNavigateToPOI!: () => void;
  private unsubscribeVenueChanged!: () => void;

  constructor() {
    super({ key: 'CityMapScene' });
  }

  /**
   * Initialize scene with venue configuration
   */
  init(data?: CityMapSceneData): void {
    this.currentVenueId = data?.venueId || VenueId.PITTSBURGH;
    const config = getVenueConfig(this.currentVenueId);
    if (!config) {
      console.error(`Venue not found: ${this.currentVenueId}, using default`);
      this.venueConfig = getDefaultVenue();
      this.currentVenueId = this.venueConfig.id;
    } else {
      this.venueConfig = config;
    }
    // Update world dimensions from config
    this.worldWidth = this.venueConfig.outdoorMap.worldBounds.width;
    this.worldHeight = this.venueConfig.outdoorMap.worldBounds.height;

    // Set initial zone from config
    const districts = this.venueConfig.outdoorMap.districts;
    this.currentZone = districts && districts.length > 0 ? districts[0].id : 'outdoor';
  }

  create(): void {
    // Set world bounds for physics
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Create a larger map background with grid pattern
    this.createMapBackground();

    // Create zones/districts from config
    this.createDistrictsFromConfig();

    // Create InputManager for unified input handling (keyboard + touch)
    this.inputManager = new InputManager(this);

    // Create the player using the Player entity with InputManager
    // Use spawn point from venue config
    const spawnPoint = this.venueConfig.outdoorMap.spawnPoint;

    // Get player display name from localStorage
    const playerName = this.getPlayerDisplayName();

    this.player = new Player({
      scene: this,
      x: spawnPoint.x,
      y: spawnPoint.y,
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

    // Initialize POIManager for outdoor landmarks
    this.poiManager = new POIManager({
      scene: this,
      showLabels: true,
      showDistances: false,
    });

    // Create UI elements (fixed to camera)
    this.createUI();

    // Add buildings (Convention Center has custom interaction)
    this.createBuildings();

    // Register outdoor POIs for landmarks
    this.createOutdoorPOIs();

    // Initialize PresenceManager for attendee markers
    // Enabled state is controlled via EventBus events (toggle-attendee-markers)
    // when user grants/revokes location sharing consent
    this.presenceManager = new PresenceManager({
      scene: this,
      enabled: this.getLocationConsentFromStorage(),
      maxVisibleMarkers: 50,
      clusterDistance: 80,
    });

    // Add instructions
    this.createInstructions();

    // Setup event handlers for action button and navigation
    this.setupEventHandlers();
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

  /**
   * Create districts from venue configuration
   */
  private createDistrictsFromConfig(): void {
    this.venueConfig.outdoorMap.districts?.forEach((district) => {
      this.createDistrict(
        district.bounds.x,
        district.bounds.y,
        district.bounds.width,
        district.bounds.height,
        district.color,
        district.name
      );
    });
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

  /**
   * Create buildings from venue configuration's indoor venues
   */
  private createBuildings(): void {
    const indoorVenues = this.venueConfig.outdoorMap.indoorVenues;

    indoorVenues.forEach((venue) => {
      if (!venue.buildingPosition) {
        return;
      }

      const { x, y } = venue.buildingPosition;
      const buildingWidth = 200;
      const buildingHeight = 150;
      const color = 0x2a9d8f;

      const building = this.add
        .rectangle(x, y, buildingWidth, buildingHeight, color, 0.4)
        .setStrokeStyle(4, color)
        .setInteractive({ useHandCursor: true });

      // Multi-line display name for building label
      const displayLines = venue.displayName.split(' ');
      const labelText = displayLines.length > 2
        ? displayLines.slice(0, 2).join(' ') + '\n' + displayLines.slice(2).join(' ')
        : venue.displayName;

      this.add
        .text(x, y, labelText, {
          font: 'bold 16px Source Sans 3',
          color: '#2C3E50',
          align: 'center',
        })
        .setOrigin(0.5);

      // Add hover effect
      building.on('pointerover', () => {
        building.setFillStyle(color, 0.7);
      });

      building.on('pointerout', () => {
        building.setFillStyle(color, 0.4);
      });

      // Click handler for entering building
      building.on('pointerdown', () => {
        const floors = venue.floors.map((f) => f.floor);
        eventBus.emit('entered-building', {
          building: venue.id,
          venueId: this.currentVenueId,
          floors,
          currentFloor: venue.floors[0].floor,
        });
        this.cameraController.fadeOut(500);
        this.time.delayedCall(500, () => {
          this.scene.start('ConventionCenterScene', {
            venueId: this.currentVenueId,
            indoorVenueId: venue.id,
            floor: venue.floors[0].floor,
          });
        });
      });
    });
  }

  /**
   * Create outdoor POIs for city landmarks using POIManager
   * Registers indoor venues as POI landmarks for navigation
   */
  private createOutdoorPOIs(): void {
    // Register indoor venues as POI landmarks
    const indoorVenues = this.venueConfig.outdoorMap.indoorVenues;

    indoorVenues.forEach((venue) => {
      if (!venue.buildingPosition) {
        return;
      }

      const { x, y } = venue.buildingPosition;
      this.registerPOI(
        `${venue.id}-poi`,
        x,
        y,
        venue.displayName,
        POIType.LANDMARK,
        'outdoor'
      );
    });
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
    zone: string
  ): void {
    const poiData: POIData = {
      id,
      type,
      name,
      position: { x, y, zone },
      isActive: true,
      isPulsing: false,
    };

    this.poiManager.registerPOI(poiData);
  }

  private createUI(): void {
    // Title - fixed to camera (uses venue displayName from config)
    this.add
      .text(20, 20, `Beat Street: ${this.venueConfig.displayName}`, {
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
          'Tap POIs or use action button',
        ]
      : [
          'WASD or Arrow Keys - Move',
          'Mouse Wheel / +/- - Zoom',
          'E or Space - Interact with nearby POI',
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

    // Update presence markers
    this.presenceManager.update(time);
  }

  private getLocationConsentFromStorage(): boolean {
    const consent = localStorage.getItem('location-consent');
    return consent === 'true';
  }

  /**
   * Setup event handlers for action button, POI navigation, and venue changes
   */
  private setupEventHandlers(): void {
    // Handle action button press (mobile) or keyboard interact (desktop)
    this.unsubscribeActionButton = eventBus.on('action-button-pressed', this.handleActionButton.bind(this));

    // Handle navigation to POI request
    this.unsubscribeNavigateToPOI = eventBus.on('navigate-to-poi', this.handleNavigateToPOI.bind(this));

    // Handle venue change - restart scene with new venue config
    this.unsubscribeVenueChanged = eventBus.on('venue-changed', this.handleVenueChanged.bind(this));
  }

  /**
   * Handle venue change event - restart scene with new venue
   */
  private handleVenueChanged(data: unknown): void {
    const venueData = data as { venueId: VenueId };
    if (venueData && venueData.venueId && venueData.venueId !== this.currentVenueId) {
      this.scene.restart({ venueId: venueData.venueId });
    }
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
    this.unsubscribeActionButton?.();
    this.unsubscribeNavigateToPOI?.();
    this.unsubscribeVenueChanged?.();

    // Cleanup CameraController (pointer, keyboard, scale events)
    if (this.cameraController) {
      this.cameraController.destroy();
    }

    // Cleanup when scene shuts down
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
      console.warn('[CityMapScene] Failed to get player display name:', error);
    }
    return 'You';
  }
}
