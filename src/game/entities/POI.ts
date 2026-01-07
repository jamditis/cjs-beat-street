import Phaser from 'phaser';
import { POIData, POIType, POIConfig } from '../../types/poi';
import { eventBus } from '../../lib/EventBus';

export class POI {
  private scene: Phaser.Scene;
  public data: POIData;
  public sprite!: Phaser.GameObjects.Arc;
  public label?: Phaser.GameObjects.Text;
  private distanceText?: Phaser.GameObjects.Text;
  private glowEffect?: Phaser.GameObjects.Arc;
  private pulseAnimation?: Phaser.Tweens.Tween;
  private hoverAnimation?: Phaser.Tweens.Tween;
  private showLabel: boolean;
  private showDistance: boolean;
  private interactive: boolean;
  private baseScale: number;
  private isHovered = false;

  constructor(config: POIConfig) {
    this.scene = config.scene;
    this.data = config.data;
    this.showLabel = config.showLabel !== false;
    this.showDistance = config.showDistance || false;
    this.interactive = config.interactive !== false;
    this.baseScale = config.scale || 1;

    this.create();
  }

  private create(): void {
    const { x, y } = this.data.position;
    const color = this.getTypeColor();
    const radius = 25 * this.baseScale;

    // Create glow effect (background layer)
    this.glowEffect = this.scene.add
      .circle(x, y, radius + 5, color, 0.2)
      .setDepth(9)
      .setVisible(false);

    // Create main POI sprite
    this.sprite = this.scene.add
      .circle(x, y, radius, color, 0.7)
      .setStrokeStyle(3, color)
      .setDepth(10);

    // Create icon or marker inside the circle
    this.createIcon(x, y, this.data.type);

    // Create label if enabled
    if (this.showLabel) {
      this.createLabel(x, y);
    }

    // Create distance indicator if enabled
    if (this.showDistance) {
      this.createDistanceIndicator(x, y);
    }

    // Setup interactions
    if (this.interactive) {
      this.setupInteractions();
    }

    // Start pulse animation if flagged
    if (this.data.isPulsing) {
      this.startPulse();
    }
  }

  private createIcon(x: number, y: number, type: POIType): void {
    const iconSize = 12 * this.baseScale;
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0xffffff, 1);

    switch (type) {
      case POIType.SESSION:
        // Calendar icon
        graphics.strokeRect(x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
        graphics.lineBetween(x - iconSize / 3, y - iconSize / 4, x - iconSize / 3, y + iconSize / 4);
        graphics.lineBetween(x + iconSize / 3, y - iconSize / 4, x + iconSize / 3, y + iconSize / 4);
        break;

      case POIType.SPONSOR:
        // Building/booth icon
        graphics.strokeRect(x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
        graphics.strokeRect(x - iconSize / 4, y - iconSize / 4, iconSize / 2, iconSize / 2);
        break;

      case POIType.FOOD:
        // Coffee cup icon
        graphics.strokeCircle(x, y, iconSize / 2);
        graphics.lineBetween(x + iconSize / 2, y - iconSize / 3, x + iconSize / 2 + 4, y - iconSize / 2);
        break;

      case POIType.SOCIAL:
        // People icon
        graphics.strokeCircle(x - 4, y - 4, iconSize / 4);
        graphics.strokeCircle(x + 4, y - 4, iconSize / 4);
        graphics.lineBetween(x, y + 2, x - 4, y + iconSize / 2);
        graphics.lineBetween(x, y + 2, x + 4, y + iconSize / 2);
        break;

      case POIType.INFO:
        // Info 'i' icon
        graphics.strokeCircle(x, y, iconSize / 2);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(x, y - 4, 2);
        graphics.fillRect(x - 1, y, 2, 6);
        break;

      case POIType.LANDMARK:
        // Star icon
        const points: Phaser.Types.Math.Vector2Like[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? iconSize / 2 : iconSize / 4;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        graphics.strokePoints(points, true);
        break;
    }

    graphics.setDepth(11);
  }

  private createLabel(x: number, y: number): void {
    const offset = 40 * this.baseScale;
    this.label = this.scene.add
      .text(x, y + offset, this.data.name, {
        font: `${Math.floor(13 * this.baseScale)}px Source Sans 3`,
        color: '#2C3E50',
        backgroundColor: '#ffffff',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setAlpha(0.9);
  }

  private createDistanceIndicator(x: number, y: number): void {
    const offset = 60 * this.baseScale;
    this.distanceText = this.scene.add
      .text(x, y + offset, '', {
        font: `${Math.floor(11 * this.baseScale)}px Source Sans 3`,
        color: '#2A9D8F',
        backgroundColor: '#ffffff',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setVisible(false);
  }

  private setupInteractions(): void {
    this.sprite.setInteractive({ useHandCursor: true });

    // Hover start
    this.sprite.on('pointerover', () => {
      this.onHoverStart();
    });

    // Hover end
    this.sprite.on('pointerout', () => {
      this.onHoverEnd();
    });

    // Click
    this.sprite.on('pointerdown', () => {
      this.onClick();
    });
  }

  private onHoverStart(): void {
    if (this.isHovered) return;
    this.isHovered = true;

    // Stop pulse animation during hover
    if (this.pulseAnimation) {
      this.pulseAnimation.pause();
    }

    // Show glow effect
    if (this.glowEffect) {
      this.glowEffect.setVisible(true);
    }

    // Animate scale and color
    this.hoverAnimation = this.scene.tweens.add({
      targets: this.sprite,
      scale: this.baseScale * 1.2,
      fillAlpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    // Animate label
    if (this.label) {
      this.scene.tweens.add({
        targets: this.label,
        scale: 1.1,
        alpha: 1,
        duration: 200,
        ease: 'Power2',
      });
    }

    // Emit hover event
    eventBus.emit('poi-hover-start', {
      poiId: this.data.id,
      poiData: this.data,
      timestamp: Date.now(),
    });
  }

  private onHoverEnd(): void {
    if (!this.isHovered) return;
    this.isHovered = false;

    // Hide glow effect
    if (this.glowEffect) {
      this.glowEffect.setVisible(false);
    }

    // Reset scale and color
    if (this.hoverAnimation) {
      this.hoverAnimation.stop();
    }

    this.scene.tweens.add({
      targets: this.sprite,
      scale: this.baseScale,
      fillAlpha: 0.7,
      duration: 200,
      ease: 'Power2',
    });

    // Reset label
    if (this.label) {
      this.scene.tweens.add({
        targets: this.label,
        scale: 1,
        alpha: 0.9,
        duration: 200,
        ease: 'Power2',
      });
    }

    // Resume pulse animation if enabled
    if (this.pulseAnimation && this.data.isPulsing) {
      this.pulseAnimation.resume();
    }

    // Emit hover end event
    eventBus.emit('poi-hover-end', {
      poiId: this.data.id,
      poiData: this.data,
      timestamp: Date.now(),
    });
  }

  private onClick(): void {
    // Visual feedback
    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: this.baseScale * 1.3, to: this.baseScale * 1.2 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Emit selection event
    eventBus.emit('poi-selected', {
      poiId: this.data.id,
      type: this.data.type,
      data: this.data,
    });

    // Emit interaction event
    eventBus.emit('poi-interaction', {
      poiId: this.data.id,
      poiData: this.data,
      timestamp: Date.now(),
      interactionType: 'click',
    });
  }

  public startPulse(): void {
    this.data.isPulsing = true;

    // Stop existing pulse if any
    if (this.pulseAnimation) {
      this.pulseAnimation.stop();
    }

    this.pulseAnimation = this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: this.baseScale * 0.95, to: this.baseScale * 1.05 },
      fillAlpha: { from: 0.6, to: 0.9 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public stopPulse(): void {
    this.data.isPulsing = false;

    if (this.pulseAnimation) {
      this.pulseAnimation.stop();
      this.pulseAnimation = undefined;
    }

    // Reset to default state
    this.sprite.setScale(this.baseScale);
    this.sprite.setFillStyle(this.getTypeColor(), 0.7);
  }

  public updateDistance(distance: number): void {
    if (!this.distanceText) return;

    const distanceText = distance < 100 ? `${Math.round(distance)}m` : `${Math.round(distance / 100) * 100}m`;
    this.distanceText.setText(distanceText);
    this.distanceText.setVisible(true);
  }

  public hideDistance(): void {
    if (this.distanceText) {
      this.distanceText.setVisible(false);
    }
  }

  public setActive(active: boolean): void {
    this.data.isActive = active;
    this.sprite.setAlpha(active ? 1 : 0.5);
    if (this.label) {
      this.label.setAlpha(active ? 0.9 : 0.5);
    }

    if (!active) {
      this.stopPulse();
    }
  }

  public setPosition(x: number, y: number): void {
    this.data.position.x = x;
    this.data.position.y = y;

    this.sprite.setPosition(x, y);
    if (this.glowEffect) {
      this.glowEffect.setPosition(x, y);
    }
    if (this.label) {
      this.label.setPosition(x, y + 40 * this.baseScale);
    }
    if (this.distanceText) {
      this.distanceText.setPosition(x, y + 60 * this.baseScale);
    }
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.data.position.x, y: this.data.position.y };
  }

  public getDistanceTo(x: number, y: number): number {
    const dx = this.data.position.x - x;
    const dy = this.data.position.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTypeColor(): number {
    switch (this.data.type) {
      case POIType.SESSION:
        return 0x2a9d8f; // teal
      case POIType.SPONSOR:
        return 0xe9c46a; // gold
      case POIType.FOOD:
        return 0xf4a261; // orange
      case POIType.SOCIAL:
        return 0xe76f51; // coral
      case POIType.INFO:
        return 0x457b9d; // blue
      case POIType.LANDMARK:
        return 0x2c3e50; // ink
      default:
        return 0x2c3e50;
    }
  }

  public highlight(): void {
    this.startPulse();
    if (this.glowEffect) {
      this.glowEffect.setVisible(true);
    }
  }

  public unhighlight(): void {
    this.stopPulse();
    if (this.glowEffect && !this.isHovered) {
      this.glowEffect.setVisible(false);
    }
  }

  public destroy(): void {
    if (this.pulseAnimation) {
      this.pulseAnimation.stop();
    }
    if (this.hoverAnimation) {
      this.hoverAnimation.stop();
    }

    this.sprite.destroy();
    this.glowEffect?.destroy();
    this.label?.destroy();
    this.distanceText?.destroy();
  }
}
