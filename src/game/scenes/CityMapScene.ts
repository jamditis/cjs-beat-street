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

  // UI Elements (fixed to viewport, not affected by camera zoom)
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiElements: Phaser.GameObjects.GameObject[] = [];
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

    // Create a separate UI camera that doesn't zoom
    // This ensures HUD elements stay fixed to the viewport
    this.uiCamera = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.uiCamera.setScroll(0, 0);
    // UI camera ignores world objects (they're rendered by main camera)
    this.uiCamera.ignore([]);

    // Initialize POIManager for outdoor landmarks
    this.poiManager = new POIManager({
      scene: this,
      showLabels: true,
      showDistances: false,
    });

    // Create UI elements (fixed to viewport via UI camera)
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
    // Main background - lighter cream/grass color
    this.add.rectangle(
      this.worldWidth / 2,
      this.worldHeight / 2,
      this.worldWidth,
      this.worldHeight,
      0xe8e4d4
    );

    // Add subtle terrain variation with grass tiles if available
    this.createTerrainLayer();

    // Create very subtle grid pattern (mostly invisible, just hints)
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xd8d0c0, 0.15); // Much more subtle

    const gridSize = 200; // Larger grid
    for (let x = 0; x <= this.worldWidth; x += gridSize) {
      graphics.lineBetween(x, 0, x, this.worldHeight);
    }
    for (let y = 0; y <= this.worldHeight; y += gridSize) {
      graphics.lineBetween(0, y, this.worldWidth, y);
    }
  }

  /**
   * Create terrain layer with grass and path variations
   */
  private createTerrainLayer(): void {
    // Add scattered grass tiles for texture
    const grassPositions = this.generateScatteredPositions(40, 100);
    grassPositions.forEach(({ x, y }) => {
      if (this.textures.exists('grass')) {
        const grass = this.add.image(x, y, 'grass');
        grass.setScale(0.4);
        grass.setAlpha(0.3);
        grass.setDepth(-10);
      }
    });

    // Add path/road areas connecting districts
    this.createPathways();
  }

  /**
   * Generate scattered random positions avoiding building zones
   */
  private generateScatteredPositions(count: number, margin: number): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const indoorVenues = this.venueConfig.outdoorMap.indoorVenues;

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = margin + Math.random() * (this.worldWidth - margin * 2);
        y = margin + Math.random() * (this.worldHeight - margin * 2);
        attempts++;
      } while (this.isNearBuilding(x, y, indoorVenues, 150) && attempts < 20);

      if (attempts < 20) {
        positions.push({ x, y });
      }
    }
    return positions;
  }

  /**
   * Check if position is near a building
   */
  private isNearBuilding(
    x: number,
    y: number,
    indoorVenues: typeof this.venueConfig.outdoorMap.indoorVenues,
    minDistance: number
  ): boolean {
    return indoorVenues.some((venue) => {
      if (!venue.buildingPosition) return false;
      const dx = x - venue.buildingPosition.x;
      const dy = y - venue.buildingPosition.y;
      return Math.sqrt(dx * dx + dy * dy) < minDistance;
    });
  }

  /**
   * Create visual pathways between areas
   */
  private createPathways(): void {
    const graphics = this.add.graphics();
    graphics.setDepth(-5);

    // Main horizontal path
    graphics.fillStyle(0xd4cbb8, 0.5);
    graphics.fillRoundedRect(50, this.worldHeight / 2 - 30, this.worldWidth - 100, 60, 8);

    // Vertical connector paths
    graphics.fillRoundedRect(this.worldWidth / 3 - 25, 100, 50, this.worldHeight - 200, 8);
    graphics.fillRoundedRect((this.worldWidth * 2) / 3 - 25, 100, 50, this.worldHeight - 200, 8);
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
      const color = 0x2a9d8f;

      // Create building using sprite if available, otherwise use rectangle
      let buildingSprite: Phaser.GameObjects.Image | null = null;
      let buildingRect: Phaser.GameObjects.Rectangle | null = null;

      // Try to use museum sprite for convention center (large building)
      if (this.textures.exists('townhall')) {
        buildingSprite = this.add.image(x, y, 'townhall');
        buildingSprite.setScale(0.8);
        buildingSprite.setDepth(5);
        buildingSprite.setInteractive({ useHandCursor: true });

        // Add subtle shadow
        const shadow = this.add.ellipse(x, y + buildingSprite.displayHeight * 0.4, 180, 40, 0x000000, 0.15);
        shadow.setDepth(4);
      } else {
        // Fallback to rectangle
        const buildingWidth = 200;
        const buildingHeight = 150;
        buildingRect = this.add
          .rectangle(x, y, buildingWidth, buildingHeight, color, 0.4)
          .setStrokeStyle(4, color)
          .setDepth(5)
          .setInteractive({ useHandCursor: true });
      }

      // Multi-line display name for building label
      const displayLines = venue.displayName.split(' ');
      const labelText = displayLines.length > 2
        ? displayLines.slice(0, 2).join(' ') + '\n' + displayLines.slice(2).join(' ')
        : venue.displayName;

      // Add label with background for readability
      const labelY = buildingSprite
        ? y + buildingSprite.displayHeight * 0.5 + 20
        : y + 90;

      const label = this.add
        .text(x, labelY, labelText, {
          font: 'bold 14px Source Sans 3',
          color: '#2C3E50',
          align: 'center',
          backgroundColor: '#ffffffdd',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(10);

      const target = buildingSprite || buildingRect;

      if (target) {
        // Add hover effect
        target.on('pointerover', () => {
          if (buildingSprite) {
            buildingSprite.setTint(0xccffcc);
          } else if (buildingRect) {
            buildingRect.setFillStyle(color, 0.7);
          }
          label.setScale(1.05);
        });

        target.on('pointerout', () => {
          if (buildingSprite) {
            buildingSprite.clearTint();
          } else if (buildingRect) {
            buildingRect.setFillStyle(color, 0.4);
          }
          label.setScale(1);
        });

        // Click handler for entering building
        target.on('pointerdown', () => {
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
      }
    });

    // Add decorative buildings around the map
    this.createDecorativeBuildings();
  }

  /**
   * Create decorative buildings to fill out the cityscape
   */
  private createDecorativeBuildings(): void {
    const decorativeSpots = [
      // Downtown area buildings
      { x: 150, y: 200, sprite: 'hotel', scale: 0.6 },
      { x: 600, y: 150, sprite: 'cafe', scale: 0.5 },
      { x: 700, y: 700, sprite: 'store', scale: 0.5 },
      // Cultural district buildings
      { x: 1100, y: 200, sprite: 'museum', scale: 0.6 },
      { x: 1300, y: 400, sprite: 'theater', scale: 0.55 },
      { x: 950, y: 650, sprite: 'library', scale: 0.5 },
      // Waterfront area
      { x: 1900, y: 300, sprite: 'restaurant', scale: 0.5 },
      { x: 2100, y: 600, sprite: 'apartment', scale: 0.5 },
      { x: 1750, y: 800, sprite: 'mall', scale: 0.55 },
      // Additional buildings for density
      { x: 200, y: 700, sprite: 'postoffice', scale: 0.5 },
      { x: 1500, y: 200, sprite: 'school', scale: 0.5 },
      { x: 2200, y: 1000, sprite: 'hospital', scale: 0.55 },
      // Southern area
      { x: 300, y: 1200, sprite: 'firestation', scale: 0.5 },
      { x: 800, y: 1400, sprite: 'police', scale: 0.5 },
      { x: 1200, y: 1100, sprite: 'cafe', scale: 0.45 },
      { x: 1600, y: 1300, sprite: 'store', scale: 0.45 },
      { x: 2000, y: 1500, sprite: 'hotel', scale: 0.55 },
    ];

    decorativeSpots.forEach(({ x, y, sprite, scale }) => {
      if (this.textures.exists(sprite)) {
        // Add shadow first
        const building = this.add.image(x, y, sprite);
        building.setScale(scale);
        building.setDepth(3);

        // Shadow ellipse
        const shadowWidth = building.displayWidth * 0.8;
        const shadow = this.add.ellipse(x, y + building.displayHeight * 0.4, shadowWidth, 20, 0x000000, 0.1);
        shadow.setDepth(2);
      }
    });

    // Add vegetation (trees, bushes) around buildings
    this.createVegetation();
  }

  /**
   * Create vegetation (trees, bushes) for a more natural look
   */
  private createVegetation(): void {
    const treeSprites = ['tree1', 'tree2', 'tree3', 'tree4', 'pine1', 'pine2'];
    const bushSprites = ['bush1', 'bush2', 'bush3'];

    // Tree positions - along paths and in parks
    const treePositions = [
      // Along main horizontal path
      { x: 150, y: 870 }, { x: 350, y: 930 }, { x: 550, y: 870 },
      { x: 750, y: 930 }, { x: 950, y: 870 }, { x: 1150, y: 930 },
      { x: 1350, y: 870 }, { x: 1550, y: 930 }, { x: 1750, y: 870 },
      { x: 1950, y: 930 }, { x: 2150, y: 870 },
      // Park area in cultural district
      { x: 1050, y: 500 }, { x: 1150, y: 550 }, { x: 1250, y: 480 },
      // Waterfront trees
      { x: 1700, y: 200 }, { x: 1850, y: 150 }, { x: 2000, y: 250 },
      { x: 1700, y: 1200 }, { x: 1900, y: 1350 }, { x: 2100, y: 1150 },
      // Downtown park
      { x: 100, y: 500 }, { x: 200, y: 550 }, { x: 150, y: 600 },
      // Southern area
      { x: 500, y: 1500 }, { x: 700, y: 1550 }, { x: 900, y: 1600 },
      { x: 1100, y: 1550 }, { x: 1300, y: 1500 },
    ];

    treePositions.forEach(({ x, y }) => {
      const spriteKey = treeSprites[Math.floor(Math.random() * treeSprites.length)];
      if (this.textures.exists(spriteKey)) {
        const tree = this.add.image(x, y, spriteKey);
        tree.setScale(0.35 + Math.random() * 0.15);
        tree.setDepth(y); // Trees sort by y position
        tree.setAlpha(0.9);
      }
    });

    // Bushes near buildings and paths
    const bushPositions = [
      { x: 100, y: 280 }, { x: 200, y: 250 }, { x: 650, y: 200 },
      { x: 1050, y: 280 }, { x: 1350, y: 350 }, { x: 1800, y: 380 },
      { x: 300, y: 1250 }, { x: 850, y: 1450 }, { x: 1650, y: 1350 },
      { x: 450, y: 500 }, { x: 550, y: 480 }, { x: 1000, y: 750 },
      { x: 2050, y: 400 }, { x: 2150, y: 800 }, { x: 1400, y: 1100 },
    ];

    bushPositions.forEach(({ x, y }) => {
      const spriteKey = bushSprites[Math.floor(Math.random() * bushSprites.length)];
      if (this.textures.exists(spriteKey)) {
        const bush = this.add.image(x, y, spriteKey);
        bush.setScale(0.3 + Math.random() * 0.1);
        bush.setDepth(y);
        bush.setAlpha(0.85);
      }
    });

    // Add fountain in central area if sprite exists
    if (this.textures.exists('fountain')) {
      const fountain = this.add.image(this.worldWidth / 2, this.worldHeight / 2 - 150, 'fountain');
      fountain.setScale(0.5);
      fountain.setDepth(800);
    }

    // Add pond in waterfront district
    if (this.textures.exists('pond')) {
      const pond = this.add.image(1850, 500, 'pond');
      pond.setScale(0.6);
      pond.setDepth(1);
    }
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
    // Get screen dimensions with fallbacks for edge cases where camera dimensions are 0
    const screenWidth = this.cameras.main.width || window.innerWidth || 800;

    // Title - fixed to viewport (uses venue displayName from config)
    const title = this.add
      .text(20, 20, `Beat Street: ${this.venueConfig.displayName}`, {
        font: 'bold 24px Playfair Display',
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.uiElements.push(title);

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
    this.uiElements.push(this.zoomText);

    // Minimap container - position from right edge with minimum position
    const minimapX = Math.max(20, screenWidth - 160);
    const minimapY = 20;
    const minimapWidth = 140;
    const minimapHeight = 105;

    const minimapBg = this.add
      .rectangle(minimapX, minimapY, minimapWidth, minimapHeight, 0xf0ebe0, 0.9)
      .setOrigin(0)
      .setStrokeStyle(2, 0x2c3e50)
      .setScrollFactor(0)
      .setDepth(100);
    this.uiElements.push(minimapBg);

    const minimapLabel = this.add
      .text(minimapX + 5, minimapY + 5, 'Map', {
        font: 'bold 12px Source Sans 3',
        color: '#2C3E50',
      })
      .setScrollFactor(0)
      .setDepth(101);
    this.uiElements.push(minimapLabel);

    // Minimap player indicator
    this.minimapIndicator = this.add
      .rectangle(minimapX + 70, minimapY + 60, 4, 4, 0xe76f51)
      .setScrollFactor(0)
      .setDepth(101);
    this.uiElements.push(this.minimapIndicator);
  }

  private createInstructions(): void {
    // Get screen height with fallback for edge cases
    const screenHeight = this.cameras.main.height || window.innerHeight || 600;

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

    const instructionsText = this.add
      .text(20, Math.max(100, screenHeight - 100), instructions.join('\n'), {
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
    const screenWidth = this.cameras.main.width || window.innerWidth || 800;
    const minimapX = Math.max(20, screenWidth - 160);
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
