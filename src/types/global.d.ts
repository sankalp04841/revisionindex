/**
 * global.d.ts
 *
 * Augments the Window interface so TypeScript knows about window.electronAPI.
 */

import type { AppSettings, AppIndex, ScanProgress } from '../../shared/types';

declare global {
  interface Window {
    electronAPI: {
      selectFolder(): Promise<string | null>;
      openFile(filePath: string): Promise<{ success: boolean; error?: string }>;
      getSettings(): Promise<AppSettings>;
      saveSettings(settings: Partial<AppSettings>): Promise<void>;
      scanFolder(rootPath: string): Promise<AppIndex>;
      startWatcher(rootPath: string): void;
      stopWatcher(): void;
      onIndexUpdated(callback: (index: AppIndex) => void): () => void;
      onScanProgress(callback: (progress: ScanProgress) => void): () => void;
      onWatcherError(callback: (error: string) => void): () => void;
    };
  }
}

export {};
