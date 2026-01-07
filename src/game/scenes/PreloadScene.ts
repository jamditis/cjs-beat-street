import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';

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

    // Load game assets
    // TODO: Add actual tileset and sprite loading here
    // this.load.image('tiles', '/assets/tilesets/city-tiles.png');
    // this.load.tilemapTiledJSON('city-map', '/assets/maps/city-map.json');
  }

  create(): void {
    eventBus.emit('assets-loaded');
    this.scene.start('CityMapScene');
  }
}
