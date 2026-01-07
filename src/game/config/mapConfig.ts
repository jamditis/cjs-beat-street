/**
 * Map configuration
 * Define available maps and their properties
 */

export interface MapConfig {
  id: string;
  name: string;
  path: string;
  tileset: string;
  spawnPoint?: { x: number; y: number };
}

export const MAP_CONFIGS: Record<string, MapConfig> = {
  sample: {
    id: 'sample',
    name: 'Sample Map',
    path: '/assets/maps/sample-map.json',
    tileset: '/assets/tilesets/sample-tileset.png',
    spawnPoint: { x: 512, y: 256 },
  },
  convention_center: {
    id: 'convention_center',
    name: 'Convention Center',
    path: '/assets/maps/convention-center.json',
    tileset: '/assets/tilesets/convention-tileset.png',
  },
};

export const LAYER_NAMES = {
  ground: 'ground',
  collision: 'collision',
  pois: 'pois',
  spawns: 'spawns',
  decorations: 'decorations',
};

export function getMapConfig(mapId: string): MapConfig | null {
  return MAP_CONFIGS[mapId] || null;
}
