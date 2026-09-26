/**
 * settings.ts
 *
 * Persists application settings using a simple JSON file via Electron's app.getPath.
 * Only stores lightweight preferences — never document data.
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { AppSettings } from '../../shared/types';

const defaults: AppSettings = {
  lastRootPath: null,
  theme: 'dark',
  windowBounds: undefined
};

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function getSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(partial: Partial<AppSettings>): void {
  const current = getSettings();
  const updated = { ...current, ...partial };
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Settings] Failed to save settings:', err);
  }
}
