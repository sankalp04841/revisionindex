/**
 * preload.ts
 *
 * Exposes a typed API to the renderer via contextBridge.
 * This runs in the preload script context — has access to Node APIs
 * but the renderer itself does NOT get direct Node access.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/types';
import type { AppSettings, AppIndex, ScanProgress } from '../shared/types';

const electronAPI = {
  // ── Folder / file operations ──────────────────────────────────
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.SELECT_FOLDER),

  openFile: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.OPEN_FILE, filePath),

  // ── Settings ──────────────────────────────────────────────────
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.GET_SETTINGS),

  saveSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SAVE_SETTINGS, settings),

  // ── Scanning ──────────────────────────────────────────────────
  scanFolder: (rootPath: string): Promise<AppIndex> =>
    ipcRenderer.invoke(IPC.SCAN_FOLDER, rootPath),

  // ── Watcher ───────────────────────────────────────────────────
  startWatcher: (rootPath: string): void =>
    ipcRenderer.send(IPC.START_WATCHER, rootPath),

  stopWatcher: (): void =>
    ipcRenderer.send(IPC.STOP_WATCHER),

  // ── Event listeners ───────────────────────────────────────────
  onIndexUpdated: (callback: (index: AppIndex) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, index: AppIndex) =>
      callback(index);
    ipcRenderer.on(IPC.INDEX_UPDATED, handler);
    // Return a cleanup function
    return () => ipcRenderer.removeListener(IPC.INDEX_UPDATED, handler);
  },

  onScanProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress) =>
      callback(progress);
    ipcRenderer.on(IPC.SCAN_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC.SCAN_PROGRESS, handler);
  },

  onWatcherError: (callback: (error: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) =>
      callback(error);
    ipcRenderer.on(IPC.WATCHER_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC.WATCHER_ERROR, handler);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer TypeScript
export type ElectronAPI = typeof electronAPI;
