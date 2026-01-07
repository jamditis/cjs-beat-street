/**
 * Tiled map loading system
 * Handles JSON maps with isometric tileset support
 */

interface Tileset {
  firstgid: number;
  name: string;
  tilewidth: number;
  tileheight: number;
  image: string;
  imagewidth: number;
  imageheight: number;
  margin: number;
  spacing: number;
}

interface Layer {
  name: string;
  type: string;
  visible: boolean;
  data?: number[];
  objects?: Array<{
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties?: Array<{ name: string; value: unknown }>;
  }>;
}

interface TiledMap {
  version: string;
  tiledversion: string;
  orientation: string;
  renderorder: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  tilesets: Tileset[];
  layers: Layer[];
  properties?: Array<{ name: string; value: unknown }>;
}

export class MapLoader {
  private map: TiledMap | null = null;

  /**
   * Load a Tiled JSON map
   */
  async loadMap(mapPath: string): Promise<TiledMap> {
    const response = await fetch(mapPath);
    if (!response.ok) {
      throw new Error(`Failed to load map: ${mapPath}`);
    }
    const mapData: TiledMap = await response.json();
    this.map = mapData;
    return mapData;
  }

  /**
   * Get the collision/obstacles layer
   */
  getCollisionLayer(): Layer | null {
    if (!this.map) return null;
    return this.map.layers.find((layer) => layer.name === 'collision' || layer.name === 'obstacles') || null;
  }

  /**
   * Get all points of interest from object layer
   */
  getPOIs(): Array<{
    id: number;
    name: string;
    x: number;
    y: number;
    type?: string;
  }> {
    if (!this.map) return [];

    const poiLayer = this.map.layers.find((layer) => layer.name === 'pois' || layer.name === 'objects');
    if (!poiLayer || !poiLayer.objects) return [];

    return poiLayer.objects.map((obj) => ({
      id: obj.id,
      name: obj.name,
      x: obj.x,
      y: obj.y,
      type: obj.properties?.find((p) => p.name === 'type')?.value as string | undefined,
    }));
  }

  /**
   * Get spawn point (first spawn object in layer)
   */
  getSpawnPoint(): { x: number; y: number } | null {
    if (!this.map) return null;

    const spawnLayer = this.map.layers.find((layer) => layer.name === 'spawns');
    if (!spawnLayer || !spawnLayer.objects || spawnLayer.objects.length === 0) {
      return null;
    }

    const spawn = spawnLayer.objects[0];
    return { x: spawn.x, y: spawn.y };
  }

  /**
   * Get map dimensions
   */
  getMapDimensions(): { width: number; height: number } | null {
    if (!this.map) return null;
    return {
      width: this.map.width * this.map.tilewidth,
      height: this.map.height * this.map.tileheight,
    };
  }

  /**
   * Get raw map data
   */
  getRawMap(): TiledMap | null {
    return this.map;
  }
}
