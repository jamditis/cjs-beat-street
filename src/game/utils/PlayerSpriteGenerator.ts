import Phaser from 'phaser';

export interface PlayerSpriteConfig {
  scene: Phaser.Scene;
  color?: string;
  shirtColor?: string;
  pantsColor?: string;
  skinTone?: string;
}

export type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export class PlayerSpriteGenerator {
  private scene: Phaser.Scene;
  private shirtColor: number;
  private pantsColor: number;
  private skinTone: number;

  private readonly charWidth = 48;
  private readonly charHeight = 64;
  private readonly shadowWidth = 40;
  private readonly shadowHeight = 16;

  constructor(config: PlayerSpriteConfig) {
    this.scene = config.scene;

    this.shirtColor = this.parseColor(config.shirtColor || '#2A9D8F');
    this.pantsColor = this.parseColor(config.pantsColor || '#2C3E50');
    this.skinTone = this.parseColor(config.skinTone || '#F4A261');
  }

  private parseColor(color: string): number {
    return parseInt(color.replace('#', '0x'));
  }

  generateSpriteSheet(textureKey: string = 'player'): void {
    const directions: Direction[] = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
    const framesPerDirection = 4;
    const totalFrames = directions.length * framesPerDirection;

    const sheetWidth = this.charWidth * framesPerDirection;
    const sheetHeight = this.charHeight * directions.length;

    const renderTexture = this.scene.add.renderTexture(0, 0, sheetWidth, sheetHeight);

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

    renderTexture.saveTexture(textureKey);
    renderTexture.destroy();

    const texture = this.scene.textures.get(textureKey);
    if (texture) {
      for (let i = 0; i < totalFrames; i++) {
        const frameX = (i % framesPerDirection) * this.charWidth;
        const frameY = Math.floor(i / framesPerDirection) * this.charHeight;
        texture.add(i, 0, frameX, frameY, this.charWidth, this.charHeight);
      }
    }

    this.createAnimations(textureKey, directions, framesPerDirection);
  }

  private drawCharacterFrame(graphics: Phaser.GameObjects.Graphics, direction: Direction, frame: number): void {
    const cx = this.charWidth / 2;
    const cy = this.charHeight / 2 + 8;

    const walkOffset = frame === 0 ? 0 : Math.sin((frame / 3) * Math.PI) * 2;

    this.drawIsometricCharacter(graphics, cx, cy - walkOffset, direction, frame);
  }

  private drawIsometricCharacter(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    direction: Direction,
    frame: number
  ): void {
    const facingRight = ['e', 'ne', 'se'].includes(direction);
    const facingLeft = ['w', 'nw', 'sw'].includes(direction);
    const facingForward = direction === 's';
    const facingBack = direction === 'n';

    const bodyWidth = 16;
    const bodyHeight = 20;

    this.drawLegs(g, cx, cy, frame, bodyWidth);

    g.fillStyle(this.shirtColor, 1);

    if (facingForward || facingBack) {
      g.fillRect(cx - bodyWidth / 2, cy - bodyHeight / 2, bodyWidth, bodyHeight);
    } else {
      const bodyPoints = this.getIsometricBodyPoints(cx, cy, bodyWidth, bodyHeight);
      g.fillPoints(bodyPoints, true);
    }

    this.drawArms(g, cx, cy, frame, facingRight, facingLeft);

    const headY = cy - bodyHeight / 2 - 8;
    g.fillStyle(this.skinTone, 1);
    g.fillCircle(cx, headY, 7);

    g.fillStyle(0x2C3E50, 1);
    if (facingRight) {
      g.fillCircle(cx + 3, headY - 1, 1);
    } else if (facingLeft) {
      g.fillCircle(cx - 3, headY - 1, 1);
    } else if (facingForward) {
      g.fillCircle(cx - 2, headY - 1, 1);
      g.fillCircle(cx + 2, headY - 1, 1);
    }

    g.lineStyle(1, 0x000000, 0.3);
    g.strokeCircle(cx, headY, 7);
  }

  private getIsometricBodyPoints(
    cx: number,
    cy: number,
    width: number,
    height: number
  ): Phaser.Geom.Point[] {
    const hw = width / 2;
    const hh = height / 2;

    return [
      new Phaser.Geom.Point(cx, cy - hh),
      new Phaser.Geom.Point(cx + hw, cy),
      new Phaser.Geom.Point(cx, cy + hh),
      new Phaser.Geom.Point(cx - hw, cy),
    ];
  }

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

    const legOffset = frame === 0 ? 0 : (frame === 1 ? -2 : frame === 2 ? 0 : 2);

    g.fillRect(cx - bodyWidth / 4 - legWidth / 2, legY + legOffset, legWidth, legHeight);
    g.fillRect(cx + bodyWidth / 4 - legWidth / 2, legY - legOffset, legWidth, legHeight);
  }

  private drawArms(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    frame: number,
    facingRight: boolean,
    facingLeft: boolean
  ): void {
    const armColor = Phaser.Display.Color.IntegerToColor(this.shirtColor).darken(10).color;
    g.fillStyle(armColor, 1);

    const armWidth = 4;
    const armLength = 10;
    const armY = cy - 5;

    const armSwing = frame === 0 ? 0 : (frame === 1 ? -1 : frame === 2 ? 0 : 1);

    if (facingRight || facingLeft) {
      const armX = facingRight ? cx + 8 : cx - 8;
      g.fillRect(armX - armWidth / 2, armY + armSwing, armWidth, armLength);
    } else {
      g.fillRect(cx - 8, armY + armSwing, armWidth, armLength);
      g.fillRect(cx + 4, armY - armSwing, armWidth, armLength);
    }
  }

  generateShadow(textureKey: string = 'player-shadow'): void {
    const graphics = this.scene.add.graphics();

    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(this.shadowWidth / 2, this.shadowHeight / 2, this.shadowWidth, this.shadowHeight);

    graphics.generateTexture(textureKey, this.shadowWidth, this.shadowHeight);
    graphics.destroy();
  }

  private createAnimations(textureKey: string, directions: Direction[], framesPerDirection: number): void {
    directions.forEach((dir, dirIndex) => {
      const startFrame = dirIndex * framesPerDirection;

      this.scene.anims.create({
        key: `player-idle-${dir}`,
        frames: this.scene.anims.generateFrameNumbers(textureKey, {
          start: startFrame,
          end: startFrame,
        }),
        frameRate: 1,
        repeat: -1,
      });

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

  static getDirectionFromVelocity(vx: number, vy: number): Direction {
    const angle = Math.atan2(vy, vx);
    const degrees = Phaser.Math.RadToDeg(angle);
    const normalized = (degrees + 360) % 360;

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
