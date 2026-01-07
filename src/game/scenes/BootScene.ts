import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  // Bound resize handler for proper cleanup
  private boundResize: ((gameSize: Phaser.Structs.Size) => void) | null = null;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load minimal assets needed for the preloader
    // The actual heavy lifting happens in PreloadScene
  }

  create(): void {
    // Initialize any game-wide settings
    this.boundResize = this.resize.bind(this);
    this.scale.on('resize', this.boundResize);

    // Move to the preload scene
    this.scene.start('PreloadScene');
  }

  private resize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);
  }

  shutdown(): void {
    // Remove resize listener
    if (this.boundResize) {
      this.scale.off('resize', this.boundResize);
      this.boundResize = null;
    }
  }
}
