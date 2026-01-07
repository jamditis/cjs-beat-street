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
    width: '100%',
    height: '100%',
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
