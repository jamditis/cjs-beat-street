import { PLAYER_PRESETS, PlayerPreset } from '../game/utils/PlayerSpriteGenerator';

const STORAGE_KEY = 'player-appearance';

/**
 * Get the current player appearance preset from localStorage
 */
export function getPlayerAppearance(): PlayerPreset {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in PLAYER_PRESETS) {
    return saved as PlayerPreset;
  }
  return 'default';
}

/**
 * Set the player appearance preset in localStorage
 */
export function setPlayerAppearance(preset: PlayerPreset): void {
  localStorage.setItem(STORAGE_KEY, preset);
}

/**
 * Get all available player appearance presets
 */
export function getAvailablePresets(): { key: PlayerPreset; label: string; colors: typeof PLAYER_PRESETS[PlayerPreset] }[] {
  return Object.entries(PLAYER_PRESETS).map(([key, colors]) => ({
    key: key as PlayerPreset,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    colors,
  }));
}

/**
 * Get the colors for a specific preset
 */
export function getPresetColors(preset: PlayerPreset): typeof PLAYER_PRESETS[PlayerPreset] {
  return PLAYER_PRESETS[preset];
}
