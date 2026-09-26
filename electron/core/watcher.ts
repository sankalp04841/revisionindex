/**
 * watcher.ts
 *
 * Wraps chokidar to watch the selected root folder recursively.
 * Debounces filesystem events and triggers a full rescan.
 *
 * Architecture:
 *   Filesystem event → debounce → full rescan → push updated index to renderer
 *
 * Note: A full rescan is used for V1 correctness. The architecture is designed
 * so incremental updates can be introduced later by replacing triggerRescan.
 */

import chokidar, { FSWatcher } from 'chokidar';
import type { AppIndex, ScanProgress } from '../../shared/types';
import { scanRootFolder } from './scanner';

type IndexUpdateCallback = (index: AppIndex) => void;
type ProgressCallback = (progress: ScanProgress) => void;
type ErrorCallback = (error: string) => void;

export class FolderWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 400;
  private rootPath: string | null = null;

  private onIndexUpdate: IndexUpdateCallback | null = null;
  private onProgress: ProgressCallback | null = null;
  private onError: ErrorCallback | null = null;

  /**
   * Start watching the given root folder.
   * Calls onIndexUpdate whenever a rescan produces a new index.
   */
  start(
    rootPath: string,
    onIndexUpdate: IndexUpdateCallback,
    onProgress: ProgressCallback,
    onError: ErrorCallback
  ): void {
    this.stop(); // Stop any existing watcher

    this.rootPath = rootPath;
    this.onIndexUpdate = onIndexUpdate;
    this.onProgress = onProgress;
    this.onError = onError;

    try {
      this.watcher = chokidar.watch(rootPath, {
        persistent: true,
        ignoreInitial: true, // Initial scan is done separately
        followSymlinks: false,
        depth: 99, // Fully recursive
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100
        },
        // Ignore common noise directories
        ignored: [
          /(^|[/\\])\../, // dotfiles
          /node_modules/,
          /\.git/
        ]
      });

      this.watcher
        .on('add', (filePath) => this.handleEvent('add', filePath))
        .on('change', (filePath) => this.handleEvent('change', filePath))
        .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
        .on('addDir', (dirPath) => this.handleEvent('addDir', dirPath))
        .on('unlinkDir', (dirPath) => this.handleEvent('unlinkDir', dirPath))
        .on('error', (error) => {
          console.error('[Watcher] Error:', error);
          this.onError?.(`Watcher error: ${error.message}`);
        });

      console.log(`[Watcher] Started watching: ${rootPath}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Watcher] Failed to start:', msg);
      this.onError?.(`Failed to start file watcher: ${msg}`);
    }
  }

  /**
   * Stop the watcher and clean up.
   */
  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close().catch((err) => {
        console.warn('[Watcher] Error during close:', err);
      });
      this.watcher = null;
    }
    this.rootPath = null;
    console.log('[Watcher] Stopped');
  }

  /**
   * Handle a filesystem event — schedule a debounced rescan.
   */
  private handleEvent(event: string, eventPath: string): void {
    console.log(`[Watcher] Event: ${event} → ${eventPath}`);
    this.scheduleRescan();
  }

  /**
   * Schedule a debounced rescan. Multiple rapid events get coalesced.
   */
  private scheduleRescan(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.triggerRescan();
    }, this.debounceMs);
  }

  /**
   * Perform a full rescan of the watched root.
   * In V1 this rescans everything; can be made incremental later.
   */
  private async triggerRescan(): Promise<void> {
    if (!this.rootPath || !this.onIndexUpdate) return;

    console.log('[Watcher] Triggering rescan...');
    try {
      const index = await scanRootFolder(this.rootPath, this.onProgress ?? undefined);
      this.onIndexUpdate(index);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Watcher] Rescan failed:', msg);
      this.onError?.(`Rescan failed: ${msg}`);
    }
  }

  get isActive(): boolean {
    return this.watcher !== null;
  }
}

// Singleton instance for the application
export const folderWatcher = new FolderWatcher();
