/**
 * Isometric coordinate conversion utilities
 * 2:1 ratio: 64x32 pixel tiles
 */

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

/**
 * Convert screen coordinates to isometric tile coordinates
 */
export function screenToIso(screenX: number, screenY: number): { tileX: number; tileY: number } {
  const x = screenX / TILE_WIDTH;
  const y = screenY / TILE_HEIGHT;

  const tileX = x + y;
  const tileY = y - x;

  return {
    tileX: Math.round(tileX),
    tileY: Math.round(tileY),
  };
}

/**
 * Convert isometric tile coordinates to screen coordinates
 */
export function isoToScreen(tileX: number, tileY: number): { screenX: number; screenY: number } {
  const screenX = (tileX - tileY) * (TILE_WIDTH / 2);
  const screenY = (tileX + tileY) * (TILE_HEIGHT / 2);

  return { screenX, screenY };
}
