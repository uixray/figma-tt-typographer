import type { TypographySettings } from '../core/rule';
import { DEFAULT_SETTINGS } from '../core/rule';

const STORAGE_KEY = 'tt-typographer-settings';

/** Save settings to Figma client storage */
export async function saveSettings(settings: TypographySettings): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEY, JSON.stringify(settings));
}

/** Load settings from Figma client storage */
export async function loadSettings(): Promise<TypographySettings> {
  try {
    const raw = await figma.clientStorage.getAsync(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return { ...DEFAULT_SETTINGS };
}
