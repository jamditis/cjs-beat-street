import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';

export class ConventionCenterScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Phaser.GameObjects.Rectangle;
  private currentFloor = 1;

  constructor() {
    super({ key: 'ConventionCenterScene' });
  }

  create(): void {
    // Create a placeholder interior background
    this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        800,
        600,
        0xfaf8f5
      )
      .setStrokeStyle(2, 0x2c3e50);

    // Floor indicator
    const floorText = this.add
      .text(
        this.cameras.main.centerX,
        80,
        `Convention Center - Floor ${this.currentFloor}`,
        {
          font: '28px Playfair Display',
          color: '#2C3E50',
        }
      )
      .setOrigin(0.5);

    // Create simple player
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

    // Exit button
    const exitBtn = this.add
      .rectangle(50, 50, 80, 40, 0x2a9d8f)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(50, 50, 'Exit', {
        font: '16px Source Sans 3',
        color: '#FFFFFF',
      })
      .setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      eventBus.emit('exited-building', {});
      this.scene.start('CityMapScene');
    });

    // Listen for floor change events from React
    eventBus.on('switch-floor', (floor: unknown) => {
      if (typeof floor === 'number') {
        this.currentFloor = floor;
        floorText.setText(`Convention Center - Floor ${this.currentFloor}`);
        eventBus.emit('floor-changed', { floor: this.currentFloor });
      }
    });

    // Add some placeholder POIs
    this.createPOI(200, 300, 'Main Hall', 'session');
    this.createPOI(400, 400, 'Sponsor Booth A', 'sponsor');
    this.createPOI(600, 300, 'Coffee Station', 'food');
  }

  private createPOI(
    x: number,
    y: number,
    name: string,
    type: string
  ): void {
    const poi = this.add
      .circle(x, y, 20, this.getPoiColor(type), 0.7)
      .setStrokeStyle(2, this.getPoiColor(type))
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y + 30, name, {
        font: '12px Source Sans 3',
        color: '#2C3E50',
      })
      .setOrigin(0.5);

    poi.on('pointerdown', () => {
      eventBus.emit('poi-selected', {
        poiId: name.toLowerCase().replace(/\s+/g, '-'),
        type,
        data: { name, floor: this.currentFloor },
      });
    });
  }

  private getPoiColor(type: string): number {
    switch (type) {
      case 'session':
        return 0x2a9d8f;
      case 'sponsor':
        return 0xe9c46a;
      case 'food':
        return 0xf4a261;
      default:
        return 0x2c3e50;
    }
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
  }
}
