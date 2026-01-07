import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';
import { PlayerSpriteGenerator, PLAYER_PRESETS } from '../utils/PlayerSpriteGenerator';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Create loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x2a9d8f, 0.2);
    progressBox.fillRect(
      this.cameras.main.centerX - 160,
      this.cameras.main.centerY - 25,
      320,
      50
    );

    // Loading text
    const loadingText = this.make.text({
      x: this.cameras.main.centerX,
      y: this.cameras.main.centerY - 50,
      text: 'Loading Beat Street...',
      style: {
        font: '20px Source Sans 3',
        color: '#2C3E50',
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    // Progress text
    const percentText = this.make.text({
      x: this.cameras.main.centerX,
      y: this.cameras.main.centerY,
      text: '0%',
      style: {
        font: '18px Source Sans 3',
        color: '#2C3E50',
      },
    });
    percentText.setOrigin(0.5, 0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      percentText.setText(`${Math.round(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(0x2a9d8f, 1);
      progressBar.fillRect(
        this.cameras.main.centerX - 150,
        this.cameras.main.centerY - 15,
        300 * value,
        30
      );
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load game assets - key sprites from the Penzilla asset pack

    // Buildings - landmark/POI buildings
    this.load.image('hotel', '/assets/tilesets/buildings/Hotel_ThreeFloors.png');
    this.load.image('cafe', '/assets/tilesets/buildings/Cafe.png');
    this.load.image('museum', '/assets/tilesets/buildings/Leasure_Museum.png');
    this.load.image('theater', '/assets/tilesets/buildings/Leasure_Theater.png');
    this.load.image('library', '/assets/tilesets/buildings/Public_Library.png');
    this.load.image('townhall', '/assets/tilesets/buildings/Public_Townhall.png');
    this.load.image('school', '/assets/tilesets/buildings/Education_School.png');
    this.load.image('hospital', '/assets/tilesets/buildings/Doctor_Hospital.png');
    this.load.image('police', '/assets/tilesets/buildings/Emergency_PoliceStation.png');
    this.load.image('firestation', '/assets/tilesets/buildings/Emergency_FireStation.png');
    this.load.image('restaurant', '/assets/tilesets/buildings/Restaurant_Burger.png');
    this.load.image('mall', '/assets/tilesets/buildings/Groceries_Mall.png');
    this.load.image('store', '/assets/tilesets/buildings/Groceries_Store.png');
    this.load.image('apartment', '/assets/tilesets/buildings/Appartment_Blue_2x2_Level3.png');
    this.load.image('postoffice', '/assets/tilesets/buildings/PostOffice.png');

    // Terrain tiles
    this.load.image('grass', '/assets/tilesets/terrain/Grass.png');
    this.load.image('asphalt', '/assets/tilesets/terrain/Asfalt.png');
    this.load.image('concrete', '/assets/tilesets/terrain/Concreet.png');
    this.load.image('dirt', '/assets/tilesets/terrain/Dirt.png');

    // Vegetation
    this.load.image('tree1', '/assets/tilesets/vegetation/Tree1.png');
    this.load.image('tree2', '/assets/tilesets/vegetation/Tree2.png');
    this.load.image('bush1', '/assets/tilesets/vegetation/Bushes1.png');

    // Infrastructure
    this.load.image('fountain', '/assets/tilesets/infrastructure/Park_Fountain.png');
    this.load.image('pond', '/assets/tilesets/infrastructure/Park_Pond.png');
    this.load.image('pool', '/assets/tilesets/infrastructure/Pool.png');

    // Vehicles (for player sprite option)
    this.load.image('car-blue', '/assets/tilesets/vehicles/CarType1_Blue_Front.png');
    this.load.image('bus', '/assets/tilesets/vehicles/Bus_Yellow_Front.png');

    // Houses
    this.load.image('house-blue', '/assets/tilesets/houses/Blue/House_Type1.png');
    this.load.image('house-red', '/assets/tilesets/houses/Red/House_Type1.png');
  }

  create(): void {
    // Generate player sprites and animations
    this.generatePlayerSprites();

    eventBus.emit('assets-loaded');
    this.scene.start('CityMapScene');
  }

  /**
   * Generate player character sprites with all animations
   */
  private generatePlayerSprites(): void {
    // Get player appearance preference from localStorage
    const savedPreset = localStorage.getItem('player-appearance');
    const preset = (savedPreset && savedPreset in PLAYER_PRESETS)
      ? savedPreset as keyof typeof PLAYER_PRESETS
      : 'default';

    const appearance = PLAYER_PRESETS[preset];

    // Generate the main player sprite sheet
    const generator = new PlayerSpriteGenerator({
      scene: this,
      shirtColor: appearance.shirtColor,
      pantsColor: appearance.pantsColor,
      skinTone: appearance.skinTone,
    });

    generator.generateSpriteSheet('player');
    generator.generateShadow('player-shadow');

    console.log(`[PreloadScene] Generated player sprites with '${preset}' appearance`);
  }
}
