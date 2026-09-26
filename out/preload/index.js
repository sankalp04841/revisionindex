"use strict";
const electron = require("electron");
const IPC = {
  SELECT_FOLDER: "select-folder",
  OPEN_FILE: "open-file",
  GET_SETTINGS: "get-settings",
  SAVE_SETTINGS: "save-settings",
  SCAN_FOLDER: "scan-folder",
  START_WATCHER: "start-watcher",
  STOP_WATCHER: "stop-watcher",
  INDEX_UPDATED: "index-updated",
  SCAN_PROGRESS: "scan-progress",
  WATCHER_ERROR: "watcher-error"
};
const electronAPI = {
  // ── Folder / file operations ──────────────────────────────────
  selectFolder: () => electron.ipcRenderer.invoke(IPC.SELECT_FOLDER),
  openFile: (filePath) => electron.ipcRenderer.invoke(IPC.OPEN_FILE, filePath),
  // ── Settings ──────────────────────────────────────────────────
  getSettings: () => electron.ipcRenderer.invoke(IPC.GET_SETTINGS),
  saveSettings: (settings) => electron.ipcRenderer.invoke(IPC.SAVE_SETTINGS, settings),
  // ── Scanning ──────────────────────────────────────────────────
  scanFolder: (rootPath) => electron.ipcRenderer.invoke(IPC.SCAN_FOLDER, rootPath),
  // ── Watcher ───────────────────────────────────────────────────
  startWatcher: (rootPath) => electron.ipcRenderer.send(IPC.START_WATCHER, rootPath),
  stopWatcher: () => electron.ipcRenderer.send(IPC.STOP_WATCHER),
  // ── Event listeners ───────────────────────────────────────────
  onIndexUpdated: (callback) => {
    const handler = (_event, index) => callback(index);
    electron.ipcRenderer.on(IPC.INDEX_UPDATED, handler);
    return () => electron.ipcRenderer.removeListener(IPC.INDEX_UPDATED, handler);
  },
  onScanProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    electron.ipcRenderer.on(IPC.SCAN_PROGRESS, handler);
    return () => electron.ipcRenderer.removeListener(IPC.SCAN_PROGRESS, handler);
  },
  onWatcherError: (callback) => {
    const handler = (_event, error) => callback(error);
    electron.ipcRenderer.on(IPC.WATCHER_ERROR, handler);
    return () => electron.ipcRenderer.removeListener(IPC.WATCHER_ERROR, handler);
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
