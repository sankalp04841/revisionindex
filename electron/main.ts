/**
 * main.ts
 *
 * Electron main process entry point.
 * Responsibilities:
 *  - Create browser window
 *  - Register all IPC handlers
 *  - Manage the folder watcher lifecycle
 *  - Handle app events (quit, focus, etc.)
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC } from '../shared/types';
import type { AppSettings, AppIndex, ScanProgress } from '../shared/types';
import { scanRootFolder } from './core/scanner';
import { folderWatcher } from './core/watcher';
import { getSettings, saveSettings } from './utils/settings';

// ─────────────────────────────────────────────────────────────
// Window management
// ─────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const settings = getSettings();
  const bounds = settings.windowBounds ?? { width: 1280, height: 800 };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    title: 'Document Revision Index',
    backgroundColor: '#18181b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    // Frameless-style but keep native title bar for resize/snap support
    frame: true,
    show: false // Show after content loads to avoid flash
  });

  // Load the renderer
  // electron-vite sets ELECTRON_RENDERER_URL in dev mode
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window bounds on move/resize
  const saveBounds = (): void => {
    if (!mainWindow) return;
    const { x, y, width, height } = mainWindow.getBounds();
    saveSettings({ windowBounds: { x, y, width, height } });
  };

  mainWindow.on('moved', saveBounds);
  mainWindow.on('resized', saveBounds);

  mainWindow.on('closed', () => {
    mainWindow = null;
    folderWatcher.stop();
  });
}

// ─────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  folderWatcher.stop();
  if (process.platform !== 'darwin') app.quit();
});

// ─────────────────────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // ── Select folder dialog ────────────────────────────────────
  ipcMain.handle(IPC.SELECT_FOLDER, async (): Promise<string | null> => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Document Root Folder'
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // ── Open file with OS default application ──────────────────
  ipcMain.handle(
    IPC.OPEN_FILE,
    async (_event, filePath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        // Verify file exists before attempting to open
        await fs.promises.access(filePath, fs.constants.R_OK);
        const error = await shell.openPath(filePath);
        if (error) {
          return { success: false, error };
        }
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }
  );

  // ── Get settings ────────────────────────────────────────────
  ipcMain.handle(IPC.GET_SETTINGS, (): AppSettings => {
    return getSettings();
  });

  // ── Save settings ───────────────────────────────────────────
  ipcMain.handle(IPC.SAVE_SETTINGS, (_event, partial: Partial<AppSettings>): void => {
    saveSettings(partial);
  });

  // ── Scan folder ─────────────────────────────────────────────
  ipcMain.handle(IPC.SCAN_FOLDER, async (_event, rootPath: string): Promise<AppIndex> => {
    const onProgress = (progress: ScanProgress): void => {
      mainWindow?.webContents.send(IPC.SCAN_PROGRESS, progress);
    };
    return scanRootFolder(rootPath, onProgress);
  });

  // ── Start watcher ───────────────────────────────────────────
  ipcMain.on(IPC.START_WATCHER, (_event, rootPath: string): void => {
    folderWatcher.start(
      rootPath,
      // onIndexUpdate
      (index: AppIndex) => {
        mainWindow?.webContents.send(IPC.INDEX_UPDATED, index);
      },
      // onProgress
      (progress: ScanProgress) => {
        mainWindow?.webContents.send(IPC.SCAN_PROGRESS, progress);
      },
      // onError
      (error: string) => {
        mainWindow?.webContents.send(IPC.WATCHER_ERROR, error);
      }
    );
  });

  // ── Stop watcher ────────────────────────────────────────────
  ipcMain.on(IPC.STOP_WATCHER, (): void => {
    folderWatcher.stop();
  });
}
