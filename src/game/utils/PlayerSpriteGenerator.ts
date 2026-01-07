import Phaser from 'phaser';

export interface PlayerSpriteConfig {
  scene: Phaser.Scene;
  color?: string;
  shirtColor?: string;
  pantsColor?: string;
  skinTone?: string;
}

export type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/**
 * Generates high-quality isometric character sprites for Beat Street
 * Supports 8 directions and walking animations
 */
export class PlayerSpriteGenerator {
  private scene: Phaser.Scene;
  private shirtColor: number;
  private pantsColor: number;
  private skinTone: number;

  // Isometric character dimensions
  private readonly charWidth = 48;
  private readonly charHeight = 64;
  private readonly shadowWidth = 40;
  private readonly shadowHeight = 16;

  constructor(config: PlayerSpriteConfig) {
    this.scene = config.scene;

    // Default colors matching CJS brand palette
    this.shirtColor = this.parseColor(config.shirtColor || '#2A9D8F'); // teal-600
    this.pantsColor = this.parseColor(config.pantsColor || '#2C3E50'); // ink
    this.skinTone = this.parseColor(config.skinTone || '#F4A261');
  }

  private parseColor(color: string): number {
    return parseInt(color.replace('#', '0x'));
  }

  /**
   * Generate the complete player sprite sheet with all 8 directions and 4 walking frames each
   */
  generateSpriteSheet(textureKey: string = 'player'): void {
    const directions: Direction[] = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
    const framesPerDirection = 4; // idle + 3 walking frames

    // Create a sprite sheet: 8 directions × 4 frames = 32 frames
    const sheetWidth = this.charWidth * framesPerDirection;
    const sheetHeight = this.charHeight * directions.length;

    const renderTexture = this.scene.add.renderTexture(0, 0, sheetWidth, sheetHeight);

    // Generate each direction's frames
    directions.forEach((dir, dirIndex) => {
      for (let frame = 0; frame < framesPerDirection; frame++) {
        const x = frame * this.charWidth;
        const y = dirIndex * this.charHeight;

        const graphics = this.scene.add.graphics();
        this.drawCharacterFrame(graphics, dir, frame);

        renderTexture.draw(graphics, x, y);
        graphics.destroy();
      }
    });

    // Generate the texture
    renderTexture.saveTexture(textureKey);
    renderTexture.destroy();

    // Create animation configurations
    this.createAnimations(textureKey, directions, framesPerDirection);
  }

  /**
   * Draw a single character frame for a specific direction and animation frame
   */
  private drawCharacterFrame(graphics: Phaser.GameObjects.Graphics, direction: Direction, frame: number): void {
    // Center of the character canvas
    const cx = this.charWidth / 2;
    const cy = this.charHeight / 2 + 8; // Offset down a bit

    // Walking animation offset (simple bobbing)
    const walkOffset = frame === 0 ? 0 : Math.sin((frame / 3) * Math.PI) * 2;

    // Draw character based on direction
    this.drawIsometricCharacter(graphics, cx, cy - walkOffset, direction, frame);
  }

  /**
   * Draw an isometric character sprite
   */
  private drawIsometricCharacter(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    direction: Direction,
    frame: number
  ): void {
    // Determine if character is facing left or right for sprite mirroring
    const facingRight = ['e', 'ne', 'se'].includes(direction);
    const facingLeft = ['w', 'nw', 'sw'].includes(direction);
    const facingForward = direction === 's';
    const facingBack = direction === 'n';

    // Body (isometric rectangle/diamond)
    const bodyWidth = 16;
    const bodyHeight = 20;

    // Draw legs
    this.drawLegs(g, cx, cy, frame, bodyWidth);

    // Draw body/torso
    g.fillStyle(this.shirtColor, 1);

    if (facingForward || facingBack) {
      // Front/back view - draw as vertical rectangle
      g.fillRect(cx - bodyWidth / 2, cy - bodyHeight / 2, bodyWidth, bodyHeight);
    } else {
      // Side view - draw as isometric diamond
      const bodyPoints = this.getIsometricBodyPoints(cx, cy, bodyWidth, bodyHeight);
      g.fillPoints(bodyPoints, true);
    }

    // Draw arms
    this.drawArms(g, cx, cy, frame, facingRight, facingLeft);

    // Draw head
    const headY = cy - bodyHeight / 2 - 8;
    g.fillStyle(this.skinTone, 1);
    g.fillCircle(cx, headY, 7);

    // Add simple facial feature (eyes)
    g.fillStyle(0x2C3E50, 1);
    if (facingRight) {
      g.fillCircle(cx + 3, headY - 1, 1);
    } else if (facingLeft) {
      g.fillCircle(cx - 3, headY - 1, 1);
    } else if (facingForward) {
      g.fillCircle(cx - 2, headY - 1, 1);
      g.fillCircle(cx + 2, headY - 1, 1);
    }

    // Add outline for better visibility
    g.lineStyle(1, 0x000000, 0.3);
    g.strokeCircle(cx, headY, 7);
  }

  /**
   * Get isometric body shape points
   */
  private getIsometricBodyPoints(
    cx: number,
    cy: number,
    width: number,
    height: number
  ): Phaser.Geom.Point[] {
    const hw = width / 2;
    const hh = height / 2;

    // Create a 3D-looking body (isometric diamond shape)
    return [
      new Phaser.Geom.Point(cx, cy - hh), // Top
      new Phaser.Geom.Point(cx + hw, cy), // Right
      new Phaser.Geom.Point(cx, cy + hh), // Bottom
      new Phaser.Geom.Point(cx - hw, cy), // Left
    ];
  }

  /**
   * Draw character legs with walking animation
   */
  private drawLegs(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    frame: number,
    bodyWidth: number
  ): void {
    g.fillStyle(this.pantsColor, 1);

    const legWidth = 5;
    const legHeight = 12;
    const legY = cy + 10;

    // Animate legs for walking
    const legOffset = frame === 0 ? 0 : (frame === 1 ? -2 : frame === 2 ? 0 : 2);

    // Left leg
    g.fillRect(cx - bodyWidth / 4 - legWidth / 2, legY + legOffset, legWidth, legHeight);

    // Right leg
    g.fillRect(cx + bodyWidth / 4 - legWidth / 2, legY - legOffset, legWidth, legHeight);
  }

  /**
   * Draw character arms
   */
  private drawArms(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    frame: number,
    facingRight: boolean,
    facingLeft: boolean
  ): void {
    // Arm color (slightly darker than shirt for contrast)
    const armColor = Phaser.Display.Color.IntegerToColor(this.shirtColor).darken(10).color;
    g.fillStyle(armColor, 1);

    const armWidth = 4;
    const armLength = 10;
    const armY = cy - 5;

    // Simple arm swing animation
    const armSwing = frame === 0 ? 0 : (frame === 1 ? -1 : frame === 2 ? 0 : 1);

    if (facingRight || facingLeft) {
      // Side view - one arm visible
      const armX = facingRight ? cx + 8 : cx - 8;
      g.fillRect(armX - armWidth / 2, armY + armSwing, armWidth, armLength);
    } else {
      // Front/back view - both arms visible
      g.fillRect(cx - 8, armY + armSwing, armWidth, armLength);
      g.fillRect(cx + 4, armY - armSwing, armWidth, armLength);
    }
  }

  /**
   * Generate a shadow sprite
   */
  generateShadow(textureKey: string = 'player-shadow'): void {
    const graphics = this.scene.add.graphics();

    // Draw an elliptical shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(this.shadowWidth / 2, this.shadowHeight / 2, this.shadowWidth, this.shadowHeight);

    graphics.generateTexture(textureKey, this.shadowWidth, this.shadowHeight);
    graphics.destroy();
  }

  /**
   * Create animations for all directions
   */
  private createAnimations(textureKey: string, directions: Direction[], framesPerDirection: number): void {
    directions.forEach((dir, dirIndex) => {
      const startFrame = dirIndex * framesPerDirection;

      // Idle animation (just the first frame)
      this.scene.anims.create({
        key: `player-idle-${dir}`,
        frames: this.scene.anims.generateFrameNumbers(textureKey, {
          start: startFrame,
          end: startFrame,
        }),
        frameRate: 1,
        repeat: -1,
      });

      // Walk animation (frames 1-3, cycling)
      this.scene.anims.create({
        key: `player-walk-${dir}`,
        frames: this.scene.anims.generateFrameNumbers(textureKey, {
          start: startFrame,
          end: startFrame + framesPerDirection - 1,
        }),
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  /**
   * Get direction from velocity vector
   */
  static getDirectionFromVelocity(vx: number, vy: number): Direction {
    // Determine 8-directional facing based on velocity
    const angle = Math.atan2(vy, vx);
    const degrees = Phaser.Math.RadToDeg(angle);
    const normalized = (degrees + 360) % 360;

    // Map angle ranges to 8 directions
    if (normalized >= 337.5 || normalized < 22.5) return 'e';
    if (normalized >= 22.5 && normalized < 67.5) return 'se';
    if (normalized >= 67.5 && normalized < 112.5) return 's';
    if (normalized >= 112.5 && normalized < 157.5) return 'sw';
    if (normalized >= 157.5 && normalized < 202.5) return 'w';
    if (normalized >= 202.5 && normalized < 247.5) return 'nw';
    if (normalized >= 247.5 && normalized < 292.5) return 'n';
    return 'ne';
  }
}

/**
 * Player appearance preset colors
 */
export const PLAYER_PRESETS = {
  default: {
    shirtColor: '#2A9D8F', // teal-600
    pantsColor: '#2C3E50', // ink
    skinTone: '#F4A261',
  },
  blue: {
    shirtColor: '#3498DB',
    pantsColor: '#2C3E50',
    skinTone: '#F4A261',
  },
  red: {
    shirtColor: '#E74C3C',
    pantsColor: '#34495E',
    skinTone: '#F4A261',
  },
  green: {
    shirtColor: '#27AE60',
    pantsColor: '#2C3E50',
    skinTone: '#F4A261',
  },
  purple: {
    shirtColor: '#9B59B6',
    pantsColor: '#34495E',
    skinTone: '#F4A261',
  },
  orange: {
    shirtColor: '#E67E22',
    pantsColor: '#2C3E50',
    skinTone: '#F4A261',
  },
};

export type PlayerPreset = keyof typeof PLAYER_PRESETS;
