import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';

export class CityMapScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Phaser.GameObjects.Rectangle;
  private currentZone = 'downtown';

  constructor() {
    super({ key: 'CityMapScene' });
  }

  create(): void {
    // Create a placeholder map background
    this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        800,
        600,
        0xf0ebe0
      )
      .setStrokeStyle(2, 0x2c3e50);

    // Add placeholder text
    this.add
      .text(this.cameras.main.centerX, 100, 'Beat Street: Pittsburgh', {
        font: '32px Playfair Display',
        color: '#2C3E50',
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.cameras.main.centerX,
        150,
        'Interactive map coming soon - use arrow keys to explore',
        {
          font: '16px Source Sans 3',
          color: '#2C3E50',
        }
      )
      .setOrigin(0.5);

    // Create a simple player representation
    this.player = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      32,
      32,
      0x2a9d8f
    );

    // Setup keyboard input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Add a clickable area representing the Convention Center
    const conventionCenter = this.add
      .rectangle(
        this.cameras.main.centerX + 100,
        this.cameras.main.centerY + 100,
        120,
        80,
        0x2a9d8f,
        0.3
      )
      .setStrokeStyle(2, 0x2a9d8f)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(
        this.cameras.main.centerX + 100,
        this.cameras.main.centerY + 100,
        'Convention\nCenter',
        {
          font: '12px Source Sans 3',
          color: '#2C3E50',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    conventionCenter.on('pointerdown', () => {
      eventBus.emit('entered-building', {
        building: 'convention-center',
        floors: [1, 2, 3],
        currentFloor: 1,
      });
      this.scene.start('ConventionCenterScene');
    });
  }

  update(): void {
    const speed = 4;

    if (this.cursors?.left?.isDown) {
      this.player.x -= speed;
    } else if (this.cursors?.right?.isDown) {
      this.player.x += speed;
    }

    if (this.cursors?.up?.isDown) {
      this.player.y -= speed;
    } else if (this.cursors?.down?.isDown) {
      this.player.y += speed;
    }

    // Emit player position for presence system
    eventBus.emit('player-moved', {
      x: this.player.x,
      y: this.player.y,
      zone: this.currentZone,
    });
  }
}
