/**
 * Hunt Item Marker Component for Phaser Game
 * Renders special markers for scavenger hunt items on the map
 * with pulsing animation for uncollected items and checkmarks for collected
 */

import Phaser from 'phaser';
import { HuntItem, HuntItemType } from '../types/gamification';

interface HuntItemMarkerConfig {
  scene: Phaser.Scene;
  item: HuntItem;
  isCompleted: boolean;
  onClick?: (item: HuntItem) => void;
  onHover?: (item: HuntItem) => void;
  onHoverEnd?: () => void;
}

/**
 * HuntItemMarker class for rendering hunt items on the Phaser map
 */
export class HuntItemMarker {
  private scene: Phaser.Scene;
  private item: HuntItem;
  private container: Phaser.GameObjects.Container;
  private marker: Phaser.GameObjects.Graphics;
  private checkmark: Phaser.GameObjects.Graphics | null = null;
  private label: Phaser.GameObjects.Text;
  private isCompleted: boolean;
  private pulseAnimation: Phaser.Tweens.Tween | null = null;

  constructor(config: HuntItemMarkerConfig) {
    this.scene = config.scene;
    this.item = config.item;
    this.isCompleted = config.isCompleted;

    // Create container at item location
    this.container = this.scene.add.container(
      config.item.location.x,
      config.item.location.y
    );

    // Create marker graphics
    this.marker = this.scene.add.graphics();
    this.drawMarker();

    // Create label
    this.label = this.scene.add.text(0, -50, config.item.name, {
      fontSize: '14px',
      color: '#2C3E50',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 4 },
      fontStyle: 'bold',
    });
    this.label.setOrigin(0.5, 1);
    this.label.setVisible(false); // Hidden by default, shown on hover

    // Add to container
    this.container.add([this.marker, this.label]);

    // Add checkmark if completed
    if (this.isCompleted) {
      this.addCheckmark();
    } else {
      // Add pulsing animation for uncollected items
      this.addPulseAnimation();
    }

    // Make interactive
    this.setupInteractivity(config);

    // Set depth to ensure markers appear above map
    this.container.setDepth(100);
  }

  /**
   * Draw the marker shape based on item type
   */
  private drawMarker(): void {
    this.marker.clear();

    const color = this.getMarkerColor();
    const size = 20;

    if (this.isCompleted) {
      // Draw muted marker for completed items
      this.marker.fillStyle(0x10b981, 0.7); // Green with transparency
      this.marker.fillCircle(0, 0, size);
      this.marker.lineStyle(3, 0xffffff);
      this.marker.strokeCircle(0, 0, size);
    } else {
      // Draw vibrant marker for uncollected items
      this.marker.fillStyle(color, 1);

      switch (this.item.type) {
        case HuntItemType.SPONSOR:
          // Square for sponsors
          this.marker.fillRect(-size, -size, size * 2, size * 2);
          this.marker.lineStyle(3, 0xffffff);
          this.marker.strokeRect(-size, -size, size * 2, size * 2);
          break;

        case HuntItemType.SESSION:
          // Triangle for sessions
          this.marker.beginPath();
          this.marker.moveTo(0, -size);
          this.marker.lineTo(size, size);
          this.marker.lineTo(-size, size);
          this.marker.closePath();
          this.marker.fillPath();
          this.marker.lineStyle(3, 0xffffff);
          this.marker.strokePath();
          break;

        case HuntItemType.LANDMARK:
          // Star for landmarks
          this.drawStar(0, 0, 5, size, size / 2);
          this.marker.lineStyle(3, 0xffffff);
          this.drawStar(0, 0, 5, size, size / 2, true);
          break;

        default:
          // Circle as fallback
          this.marker.fillCircle(0, 0, size);
          this.marker.lineStyle(3, 0xffffff);
          this.marker.strokeCircle(0, 0, size);
      }
    }
  }

  /**
   * Draw a star shape
   */
  private drawStar(
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number,
    strokeOnly = false
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    this.marker.beginPath();
    this.marker.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      this.marker.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.marker.lineTo(x, y);
      rot += step;
    }

    this.marker.lineTo(cx, cy - outerRadius);
    this.marker.closePath();

    if (strokeOnly) {
      this.marker.strokePath();
    } else {
      this.marker.fillPath();
    }
  }

  /**
   * Add checkmark overlay for completed items
   */
  private addCheckmark(): void {
    this.checkmark = this.scene.add.graphics();
    this.checkmark.lineStyle(4, 0xffffff);

    // Draw checkmark
    this.checkmark.beginPath();
    this.checkmark.moveTo(-8, 0);
    this.checkmark.lineTo(-2, 6);
    this.checkmark.lineTo(8, -6);
    this.checkmark.strokePath();

    this.container.add(this.checkmark);
  }

  /**
   * Add pulsing animation for uncollected items
   */
  private addPulseAnimation(): void {
    this.pulseAnimation = this.scene.tweens.add({
      targets: this.marker,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Get marker color based on item type
   */
  private getMarkerColor(): number {
    switch (this.item.type) {
      case HuntItemType.SPONSOR:
        return 0x3b82f6; // Blue
      case HuntItemType.SESSION:
        return 0xa855f7; // Purple
      case HuntItemType.LANDMARK:
        return 0xf59e0b; // Amber
      default:
        return 0x2a9d8f; // Teal (default)
    }
  }

  /**
   * Setup interactivity (click, hover)
   */
  private setupInteractivity(config: HuntItemMarkerConfig): void {
    // Make marker interactive
    this.marker.setInteractive(
      new Phaser.Geom.Circle(0, 0, 30),
      Phaser.Geom.Circle.Contains
    );

    // Click handler
    if (config.onClick) {
      this.marker.on('pointerdown', () => {
        config.onClick!(this.item);
      });
    }

    // Hover handlers
    this.marker.on('pointerover', () => {
      this.label.setVisible(true);
      if (config.onHover) {
        config.onHover(this.item);
      }
    });

    this.marker.on('pointerout', () => {
      this.label.setVisible(false);
      if (config.onHoverEnd) {
        config.onHoverEnd();
      }
    });
  }

  /**
   * Update marker when completion status changes
   */
  public setCompleted(completed: boolean): void {
    if (this.isCompleted === completed) return;

    this.isCompleted = completed;

    // Redraw marker
    this.drawMarker();

    if (completed) {
      // Remove pulse animation
      if (this.pulseAnimation) {
        this.pulseAnimation.stop();
        this.pulseAnimation = null;
      }

      // Reset scale and alpha
      this.marker.setScale(1);
      this.marker.setAlpha(1);

      // Add checkmark
      this.addCheckmark();
    } else {
      // Remove checkmark
      if (this.checkmark) {
        this.checkmark.destroy();
        this.checkmark = null;
      }

      // Add pulse animation
      this.addPulseAnimation();
    }
  }

  /**
   * Show label
   */
  public showLabel(): void {
    this.label.setVisible(true);
  }

  /**
   * Hide label
   */
  public hideLabel(): void {
    this.label.setVisible(false);
  }

  /**
   * Get the container
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Update marker position
   */
  public setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /**
   * Destroy the marker and clean up
   */
  public destroy(): void {
    if (this.pulseAnimation) {
      this.pulseAnimation.stop();
      this.pulseAnimation = null;
    }

    this.marker.removeAllListeners();
    this.container.destroy();
  }
}

/**
 * Utility function to create hunt item markers in a Phaser scene
 */
export function createHuntItemMarkers(
  scene: Phaser.Scene,
  items: HuntItem[],
  completedItemIds: Set<string>,
  onClick?: (item: HuntItem) => void,
  onHover?: (item: HuntItem) => void,
  onHoverEnd?: () => void
): Map<string, HuntItemMarker> {
  const markers = new Map<string, HuntItemMarker>();

  items.forEach((item) => {
    const marker = new HuntItemMarker({
      scene,
      item,
      isCompleted: completedItemIds.has(item.id),
      onClick,
      onHover,
      onHoverEnd,
    });

    markers.set(item.id, marker);
  });

  return markers;
}
