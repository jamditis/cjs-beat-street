import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { CityMapScene } from './scenes/CityMapScene';
import { ConventionCenterScene } from './scenes/ConventionCenterScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#F5F0E6',
  scale: {
    mode: Phaser.Scale.RESIZE,
    // Use explicit dimensions for initial canvas size (RESIZE mode will adapt to container)
    // Percentage-based dimensions can fail on mobile if container isn't ready
    width: window.innerWidth || 800,
    height: window.innerHeight || 600,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, CityMapScene, ConventionCenterScene],
  render: {
    pixelArt: true,
    antialias: false,
  },
};
