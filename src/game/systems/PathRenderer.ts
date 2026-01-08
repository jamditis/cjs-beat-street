import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';

export interface PathRendererConfig {
  scene: Phaser.Scene;
  lineColor?: number;
  lineAlpha?: number;
  lineWidth?: number;
  arrowColor?: number;
  arrowSize?: number;
  showDottedLine?: boolean;
  showArrow?: boolean;
  showDistance?: boolean;
}

export class PathRenderer {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private distanceText?: Phaser.GameObjects.Text;
  private isNavigating = false;
  private targetPosition: { x: number; y: number } | null = null;
  private playerPosition: { x: number; y: number } | null = null;

  // Configuration
  private lineColor: number;
  private lineAlpha: number;
  private lineWidth: number;
  private arrowColor: number;
  private arrowSize: number;
  private showDottedLine: boolean;
  private showArrow: boolean;
  private showDistance: boolean;

  // Animation
  private fadeDistance = 100; // Distance at which to start fading
  private currentAlpha = 1;

  constructor(config: PathRendererConfig) {
    this.scene = config.scene;
    this.lineColor = config.lineColor || 0x2a9d8f; // teal-600
    this.lineAlpha = config.lineAlpha || 0.8;
    this.lineWidth = config.lineWidth || 3;
    this.arrowColor = config.arrowColor || 0x2a9d8f;
    this.arrowSize = config.arrowSize || 20;
    this.showDottedLine = config.showDottedLine !== false;
    this.showArrow = config.showArrow !== false;
    this.showDistance = config.showDistance !== false;

    // Create graphics object
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(1000); // Render above most objects

    // Create distance text
    if (this.showDistance) {
      this.distanceText = this.scene.add.text(0, 0, '', {
        fontFamily: 'Source Sans 3',
        fontSize: '16px',
        color: '#2A9D8F',
        backgroundColor: '#FAF8F5',
        padding: { x: 8, y: 4 },
      });
      this.distanceText.setDepth(1001);
      this.distanceText.setVisible(false);
    }

    // Setup event listeners
    this.setupEventListeners();

    // Update on each frame
    this.scene.events.on('update', this.update, this);
  }

  /**
   * Setup event listeners for navigation events
   */
  private setupEventListeners(): void {
    // Navigation started
    const unsubStart = eventBus.on('navigation-started', (data: unknown) => {
      const navData = data as { target: { position: { x: number; y: number } } };
      this.isNavigating = true;
      this.targetPosition = navData.target.position;
    });

    // Navigation update
    const unsubUpdate = eventBus.on('navigation-update', (data: unknown) => {
      const navData = data as {
        target: { position: { x: number; y: number } };
        playerPosition: { x: number; y: number };
        distance: number;
      };
      this.targetPosition = navData.target.position;
      this.playerPosition = navData.playerPosition;

      // Calculate fade alpha based on distance
      if (navData.distance < this.fadeDistance) {
        this.currentAlpha = navData.distance / this.fadeDistance;
      } else {
        this.currentAlpha = 1;
      }
    });

    // Navigation cancelled or arrived
    const unsubCancel = eventBus.on('navigation-cancelled', () => {
      this.clear();
    });

    const unsubArrived = eventBus.on('navigation-arrived', () => {
      // Fade out on arrival
      this.scene.tweens.add({
        targets: this,
        currentAlpha: 0,
        duration: 500,
        onComplete: () => {
          this.clear();
        },
      });
    });

    // Cleanup on shutdown
    this.scene.events.once('shutdown', () => {
      unsubStart();
      unsubUpdate();
      unsubCancel();
      unsubArrived();
    });
  }

  /**
   * Update and render the path
   */
  private update(): void {
    if (!this.isNavigating || !this.targetPosition || !this.playerPosition) {
      return;
    }

    // Clear previous frame
    this.graphics.clear();

    // Calculate camera offset for world-to-screen conversion
    const camera = this.scene.cameras.main;
    const screenPlayerX = this.playerPosition.x - camera.scrollX;
    const screenPlayerY = this.playerPosition.y - camera.scrollY;
    const screenTargetX = this.targetPosition.x - camera.scrollX;
    const screenTargetY = this.targetPosition.y - camera.scrollY;

    // Draw dotted line from player to target
    if (this.showDottedLine) {
      this.drawDottedLine(
        screenPlayerX,
        screenPlayerY,
        screenTargetX,
        screenTargetY
      );
    }

    // Draw arrow at target
    if (this.showArrow) {
      this.drawArrow(screenTargetX, screenTargetY);
    }

    // Update distance text
    if (this.showDistance && this.distanceText) {
      const distance = Phaser.Math.Distance.Between(
        this.playerPosition.x,
        this.playerPosition.y,
        this.targetPosition.x,
        this.targetPosition.y
      );

      // Calculate midpoint between player and target
      const midX = (screenPlayerX + screenTargetX) / 2;
      const midY = (screenPlayerY + screenTargetY) / 2;

      this.distanceText.setText(`${Math.round(distance)}m`);
      this.distanceText.setPosition(midX - this.distanceText.width / 2, midY - 20);
      this.distanceText.setAlpha(this.currentAlpha * this.lineAlpha);
      this.distanceText.setVisible(true);
    }
  }

  /**
   * Draw a dotted line between two points
   */
  private drawDottedLine(x1: number, y1: number, x2: number, y2: number): void {
    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const dashLength = 10;
    const gapLength = 5;
    const segments = Math.floor(distance / (dashLength + gapLength));

    this.graphics.lineStyle(this.lineWidth, this.lineColor, this.currentAlpha * this.lineAlpha);

    for (let i = 0; i < segments; i++) {
      const t1 = (i * (dashLength + gapLength)) / distance;
      const t2 = ((i * (dashLength + gapLength)) + dashLength) / distance;

      const startX = x1 + (x2 - x1) * t1;
      const startY = y1 + (y2 - y1) * t1;
      const endX = x1 + (x2 - x1) * t2;
      const endY = y1 + (y2 - y1) * t2;

      this.graphics.beginPath();
      this.graphics.moveTo(startX, startY);
      this.graphics.lineTo(endX, endY);
      this.graphics.strokePath();
    }
  }

  /**
   * Draw an arrow at the target position
   */
  private drawArrow(x: number, y: number): void {
    const size = this.arrowSize;
    const alpha = this.currentAlpha * this.lineAlpha;

    // Draw pulsing circle
    const pulseScale = 1 + Math.sin(Date.now() / 300) * 0.2;

    this.graphics.fillStyle(this.arrowColor, alpha * 0.3);
    this.graphics.fillCircle(x, y, size * pulseScale);

    this.graphics.fillStyle(this.arrowColor, alpha * 0.5);
    this.graphics.fillCircle(x, y, size * 0.8);

    // Draw center dot
    this.graphics.fillStyle(this.arrowColor, alpha);
    this.graphics.fillCircle(x, y, size * 0.4);
  }

  /**
   * Clear all rendered elements
   */
  private clear(): void {
    this.graphics.clear();
    if (this.distanceText) {
      this.distanceText.setVisible(false);
    }
    this.isNavigating = false;
    this.targetPosition = null;
    this.playerPosition = null;
    this.currentAlpha = 1;
  }

  /**
   * Set whether to show the dotted line
   */
  public setShowDottedLine(show: boolean): void {
    this.showDottedLine = show;
  }

  /**
   * Set whether to show the arrow
   */
  public setShowArrow(show: boolean): void {
    this.showArrow = show;
  }

  /**
   * Set whether to show distance text
   */
  public setShowDistance(show: boolean): void {
    this.showDistance = show;
    if (this.distanceText) {
      this.distanceText.setVisible(show && this.isNavigating);
    }
  }

  /**
   * Cleanup and destroy the renderer
   */
  public destroy(): void {
    this.graphics.destroy();
    if (this.distanceText) {
      this.distanceText.destroy();
    }
    this.scene.events.off('update', this.update, this);
  }
}
