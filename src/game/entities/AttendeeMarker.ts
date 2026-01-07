import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';

export interface AttendeeMarkerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  uid: string;
  displayName: string;
  photoURL?: string;
  organization?: string;
  status: 'active' | 'idle' | 'away';
  onClick?: (uid: string) => void;
  onHover?: (uid: string, isHovered: boolean) => void;
}

export class AttendeeMarker {
  private scene: Phaser.Scene;
  private uid: string;
  private displayName: string;
  private organization?: string;
  private status: 'active' | 'idle' | 'away';
  private onClick?: (uid: string) => void;
  private onHover?: (uid: string, isHovered: boolean) => void;

  // Visual elements
  private container: Phaser.GameObjects.Container;
  private avatar: Phaser.GameObjects.Graphics;
  private avatarImage?: Phaser.GameObjects.Image;
  private statusIndicator: Phaser.GameObjects.Graphics;
  private pulseRing?: Phaser.GameObjects.Graphics;
  private nameLabel?: Phaser.GameObjects.Text;
  private isHovered = false;

  // Animation state
  private targetX: number;
  private targetY: number;
  private currentX: number;
  private currentY: number;
  private pulseTimer = 0;

  constructor(config: AttendeeMarkerConfig) {
    this.scene = config.scene;
    this.uid = config.uid;
    this.displayName = config.displayName;
    this.organization = config.organization;
    this.status = config.status;
    this.onClick = config.onClick;
    this.onHover = config.onHover;
    this.targetX = config.x;
    this.targetY = config.y;
    this.currentX = config.x;
    this.currentY = config.y;

    // Create container for all visual elements
    this.container = this.scene.add.container(config.x, config.y);
    this.container.setDepth(50); // Above most game elements but below UI

    // Create pulse ring for active status
    if (this.status === 'active') {
      this.pulseRing = this.scene.add.graphics();
      this.container.add(this.pulseRing);
    }

    // Create avatar circle
    this.avatar = this.scene.add.graphics();
    this.drawAvatar();

    // Create status indicator
    this.statusIndicator = this.scene.add.graphics();
    this.drawStatusIndicator();

    // Add elements to container
    this.container.add([this.avatar, this.statusIndicator]);

    // If photoURL is provided, attempt to load it
    if (config.photoURL) {
      this.loadPhoto(config.photoURL);
    } else {
      // Draw initials
      this.drawInitials();
    }

    // Setup interactions
    this.setupInteractions();

    // Fade in animation
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  private drawAvatar(): void {
    const radius = 20;
    this.avatar.clear();
    this.avatar.fillStyle(0x2a9d8f, 1);
    this.avatar.fillCircle(0, 0, radius);
    this.avatar.lineStyle(3, 0xffffff, 1);
    this.avatar.strokeCircle(0, 0, radius);
  }

  private drawInitials(): void {
    const initials = this.getInitials(this.displayName);
    const text = this.scene.add.text(0, 0, initials, {
      font: 'bold 14px Source Sans 3',
      color: '#ffffff',
    });
    text.setOrigin(0.5);
    this.container.add(text);
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private loadPhoto(photoURL: string): void {
    // In a real implementation, this would load the image from URL
    // For now, we'll use a placeholder approach
    const key = `avatar-${this.uid}`;

    // Check if already loaded
    if (this.scene.textures.exists(key)) {
      this.applyPhotoTexture(key);
      return;
    }

    // Load the image
    this.scene.load.image(key, photoURL);
    this.scene.load.once('complete', () => {
      this.applyPhotoTexture(key);
    });
    this.scene.load.start();
  }

  private applyPhotoTexture(key: string): void {
    this.avatarImage = this.scene.add.image(0, 0, key);
    this.avatarImage.setDisplaySize(40, 40);
    this.avatarImage.setOrigin(0.5);

    // Create circular mask
    const mask = this.scene.make.graphics({});
    mask.fillStyle(0xffffff);
    mask.fillCircle(0, 0, 20);
    const geomask = mask.createGeometryMask();
    this.avatarImage.setMask(geomask);

    this.container.add(this.avatarImage);
  }

  private drawStatusIndicator(): void {
    const color = this.getStatusColor();
    this.statusIndicator.clear();
    this.statusIndicator.fillStyle(color, 1);
    this.statusIndicator.fillCircle(14, 14, 6);
    this.statusIndicator.lineStyle(2, 0xffffff, 1);
    this.statusIndicator.strokeCircle(14, 14, 6);
  }

  private getStatusColor(): number {
    switch (this.status) {
      case 'active':
        return 0x10b981; // green-500
      case 'idle':
        return 0xeab308; // yellow-500
      case 'away':
      default:
        return 0x9ca3af; // gray-400
    }
  }

  private setupInteractions(): void {
    // Make container interactive
    this.container.setSize(50, 50);
    this.container.setInteractive(
      new Phaser.Geom.Circle(0, 0, 25),
      Phaser.Geom.Circle.Contains
    );

    // Hover effects
    this.container.on('pointerover', () => {
      this.isHovered = true;
      this.showNameLabel();
      this.scene.tweens.add({
        targets: this.container,
        scale: 1.15,
        duration: 150,
        ease: 'Back.easeOut',
      });

      // Emit hover event to EventBus
      eventBus.emit('attendee-hovered', {
        uid: this.uid,
        displayName: this.displayName,
        organization: this.organization,
        status: this.status,
        hovered: true,
      });

      // Call optional hover callback
      if (this.onHover) {
        this.onHover(this.uid, true);
      }
    });

    this.container.on('pointerout', () => {
      this.isHovered = false;
      this.hideNameLabel();
      this.scene.tweens.add({
        targets: this.container,
        scale: 1.0,
        duration: 150,
        ease: 'Power2',
      });

      // Emit hover end event
      eventBus.emit('attendee-hovered', {
        uid: this.uid,
        hovered: false,
      });

      // Call optional hover callback
      if (this.onHover) {
        this.onHover(this.uid, false);
      }
    });

    // Click handler
    this.container.on('pointerdown', () => {
      if (this.onClick) {
        this.onClick(this.uid);
      }

      // Emit click event to EventBus
      eventBus.emit('attendee-clicked', {
        uid: this.uid,
        displayName: this.displayName,
        organization: this.organization,
        status: this.status,
      });

      // Pulse animation on click
      this.scene.tweens.add({
        targets: this.container,
        scale: 1.3,
        duration: 100,
        yoyo: true,
        ease: 'Power2',
      });
    });

    // Set cursor
    this.container.on('pointerover', () => {
      this.scene.input.setDefaultCursor('pointer');
    });

    this.container.on('pointerout', () => {
      this.scene.input.setDefaultCursor('default');
    });
  }

  private showNameLabel(): void {
    if (this.nameLabel) return;

    this.nameLabel = this.scene.add.text(0, -35, this.displayName, {
      font: 'bold 12px Source Sans 3',
      color: '#2C3E50',
      backgroundColor: '#ffffff',
      padding: { x: 6, y: 3 },
    });
    this.nameLabel.setOrigin(0.5);
    this.nameLabel.setAlpha(0);
    this.container.add(this.nameLabel);

    this.scene.tweens.add({
      targets: this.nameLabel,
      alpha: 1,
      y: -40,
      duration: 200,
      ease: 'Power2',
    });
  }

  private hideNameLabel(): void {
    if (!this.nameLabel) return;

    this.scene.tweens.add({
      targets: this.nameLabel,
      alpha: 0,
      y: -35,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.nameLabel?.destroy();
        this.nameLabel = undefined;
      },
    });
  }

  public update(): void {
    // Smooth position interpolation
    const lerpFactor = 0.1;
    this.currentX = Phaser.Math.Linear(this.currentX, this.targetX, lerpFactor);
    this.currentY = Phaser.Math.Linear(this.currentY, this.targetY, lerpFactor);
    this.container.setPosition(this.currentX, this.currentY);

    // Gentle floating animation when idle
    if (!this.isHovered && this.status === 'active') {
      const offset = Math.sin(this.scene.time.now / 1000) * 2;
      this.container.y = this.currentY + offset;
    }

    // Draw pulse ring for active users
    if (this.pulseRing && this.status === 'active') {
      this.pulseTimer += 0.02;
      const scale = 1 + Math.sin(this.pulseTimer) * 0.15;
      const alpha = 0.4 + Math.sin(this.pulseTimer) * 0.2;

      this.pulseRing.clear();
      this.pulseRing.lineStyle(2, 0x2a9d8f, alpha);
      this.pulseRing.strokeCircle(0, 0, 30 * scale);
    }
  }

  public setPosition(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public updateStatus(status: 'active' | 'idle' | 'away'): void {
    if (this.status === status) return;
    this.status = status;
    this.drawStatusIndicator();

    // Pulse animation on status change
    this.scene.tweens.add({
      targets: this.statusIndicator,
      scale: 1.3,
      duration: 200,
      yoyo: true,
      ease: 'Power2',
    });
  }

  public fadeOut(callback?: () => void): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.8,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (callback) callback();
      },
    });
  }

  public destroy(): void {
    this.fadeOut(() => {
      this.container.destroy();
    });
  }

  public getUID(): string {
    return this.uid;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.targetX, y: this.targetY };
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public setNameLabelVisible(visible: boolean): void {
    if (visible && !this.nameLabel) {
      this.showNameLabel();
    } else if (!visible && this.nameLabel) {
      this.hideNameLabel();
    }
  }
}
