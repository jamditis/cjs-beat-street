import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load minimal assets needed for the preloader
    // The actual heavy lifting happens in PreloadScene
  }

  create(): void {
    // Initialize any game-wide settings
    this.scale.on('resize', this.resize, this);

    // Move to the preload scene
    this.scene.start('PreloadScene');
  }

  private resize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);
  }
}
