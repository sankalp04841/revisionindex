"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const chokidar = require("chokidar");
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
const REVISION_REGEX = /^(.+?) -(\d+)\.(\w+)$/;
function parseFileName(fileName) {
  const match = REVISION_REGEX.exec(fileName);
  if (match) {
    const [, documentName, revStr, ext] = match;
    return {
      isVersioned: true,
      documentName: documentName.trim(),
      revisionNumber: parseInt(revStr, 10),
      extension: ext.toLowerCase()
    };
  }
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex > 0) {
    return {
      isVersioned: false,
      baseName: fileName.slice(0, dotIndex),
      extension: fileName.slice(dotIndex + 1).toLowerCase()
    };
  }
  return {
    isVersioned: false,
    baseName: fileName,
    extension: ""
  };
}
function makeDocumentId(directoryPath, documentName) {
  return crypto.createHash("sha1").update(directoryPath + "\0" + documentName).digest("hex").slice(0, 16);
}
function computeMissingRevisions(revisionNumbers) {
  if (revisionNumbers.length === 0) return [];
  const sorted = [...revisionNumbers].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const missing = [];
  for (let i = min + 1; i < max; i++) {
    if (!sorted.includes(i)) {
      missing.push(i);
    }
  }
  return missing;
}
function groupFilesIntoDocuments(files, directoryPath, directoryName, directoryRelativePath) {
  const revisionMap = /* @__PURE__ */ new Map();
  const unversionedFiles = [];
  for (const file of files) {
    const result = parseFileName(file.fileName);
    if (result.isVersioned) {
      if (!revisionMap.has(result.documentName)) {
        revisionMap.set(result.documentName, /* @__PURE__ */ new Map());
      }
      const revMap = revisionMap.get(result.documentName);
      if (!revMap.has(result.revisionNumber)) {
        revMap.set(result.revisionNumber, []);
      }
      revMap.get(result.revisionNumber).push(file);
    } else {
      unversionedFiles.push(file);
    }
  }
  const documents = [];
  for (const [docName, revMap] of revisionMap.entries()) {
    const revisions = [...revMap.entries()].sort((a, b) => a[0] - b[0]).map(([revNum, files2]) => ({
      revisionNumber: revNum,
      files: files2
    }));
    const revisionNumbers = revisions.map((r) => r.revisionNumber);
    const latestRevisionNumber = revisionNumbers.length > 0 ? Math.max(...revisionNumbers) : null;
    const missingRevisions = computeMissingRevisions(revisionNumbers);
    const extensions = [
      ...new Set(
        revisions.flatMap((r) => r.files.map((f) => f.extension))
      )
    ].sort();
    documents.push({
      id: makeDocumentId(directoryPath, docName),
      name: docName,
      directoryPath,
      directoryName,
      directoryRelativePath,
      revisions,
      latestRevisionNumber,
      missingRevisions,
      extensions
    });
  }
  documents.sort((a, b) => a.name.localeCompare(b.name));
  return { documents, unversionedFiles };
}
async function collectDirectory(dirPath, rootPath, entries) {
  let dirents;
  try {
    dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    console.warn(`[Scanner] Cannot read directory: ${dirPath}`, err);
    return;
  }
  const files = [];
  for (const dirent of dirents) {
    const fullPath = path.join(dirPath, dirent.name);
    try {
      if (dirent.isDirectory()) {
        await collectDirectory(fullPath, rootPath, entries);
      } else if (dirent.isFile()) {
        const stat = await fs.promises.stat(fullPath);
        const ext = path.extname(dirent.name);
        const dotIndex = dirent.name.lastIndexOf(".");
        files.push({
          filePath: fullPath,
          fileName: dirent.name,
          extension: ext ? ext.slice(1).toLowerCase() : "",
          modifiedAt: stat.mtime.toISOString(),
          size: stat.size,
          directoryPath: dirPath,
          relativePath: path.relative(rootPath, fullPath)
        });
      }
    } catch (err) {
      console.warn(`[Scanner] Cannot stat: ${fullPath}`, err);
    }
  }
  const relativePath = path.relative(rootPath, dirPath);
  const dirName = path.basename(dirPath);
  entries.push({
    dirPath,
    dirName,
    relativePath: relativePath || ".",
    files
  });
}
function buildFolderTree(dirPath, rootPath, dirMap) {
  const entry = dirMap.get(dirPath);
  const dirName = path.basename(dirPath);
  const relativePath = path.relative(rootPath, dirPath);
  const childDirs = [];
  for (const [p] of dirMap.entries()) {
    if (p !== dirPath && path.dirname(p) === dirPath) {
      childDirs.push(p);
    }
  }
  childDirs.sort();
  const children = childDirs.map(
    (childPath) => buildFolderTree(childPath, rootPath, dirMap)
  );
  const files = entry?.files ?? [];
  const { documents, unversionedFiles } = groupFilesIntoDocuments(
    files,
    dirPath,
    dirName,
    relativePath
  );
  const totalDocuments = documents.length + children.reduce((sum, c) => sum + c.totalDocuments, 0);
  const totalUnversioned = unversionedFiles.length + children.reduce((sum, c) => sum + c.totalUnversioned, 0);
  return {
    folderPath: dirPath,
    folderName: dirName,
    relativePath,
    documents,
    unversionedFiles,
    children,
    totalDocuments,
    totalUnversioned
  };
}
function collectExtensions(folder, set) {
  for (const doc of folder.documents) {
    for (const ext of doc.extensions) {
      set.add(ext);
    }
  }
  for (const uv of folder.unversionedFiles) {
    if (uv.extension) set.add(uv.extension);
  }
  for (const child of folder.children) {
    collectExtensions(child, set);
  }
}
function countAll(folders) {
  let totalDocuments = 0;
  let totalFiles = 0;
  let totalFolders = 0;
  function traverse(f) {
    totalFolders++;
    totalDocuments += f.documents.length;
    totalFiles += f.unversionedFiles.length;
    for (const doc of f.documents) {
      for (const rev of doc.revisions) {
        totalFiles += rev.files.length;
      }
    }
    for (const child of f.children) traverse(child);
  }
  for (const f of folders) traverse(f);
  return { totalDocuments, totalFiles, totalFolders };
}
async function scanRootFolder(rootPath, onProgress) {
  onProgress?.({
    phase: "scanning",
    totalFiles: 0,
    processedFiles: 0,
    totalFolders: 0,
    message: "Discovering folders and files..."
  });
  let topLevelDirents;
  try {
    topLevelDirents = await fs.promises.readdir(rootPath, { withFileTypes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read root folder: ${msg}`);
  }
  const topLevelDirs = topLevelDirents.filter((d) => d.isDirectory()).map((d) => path.join(rootPath, d.name)).sort();
  const allEntries = [];
  for (const dir of topLevelDirs) {
    await collectDirectory(dir, rootPath, allEntries);
  }
  onProgress?.({
    phase: "parsing",
    totalFiles: allEntries.reduce((s, e) => s + e.files.length, 0),
    processedFiles: 0,
    totalFolders: allEntries.length,
    message: "Parsing filenames and revision numbers..."
  });
  const dirMap = /* @__PURE__ */ new Map();
  for (const entry of allEntries) {
    dirMap.set(entry.dirPath, entry);
  }
  onProgress?.({
    phase: "grouping",
    totalFiles: allEntries.reduce((s, e) => s + e.files.length, 0),
    processedFiles: 0,
    totalFolders: allEntries.length,
    message: "Grouping documents by revision..."
  });
  const folders = topLevelDirs.map(
    (dirPath) => buildFolderTree(dirPath, rootPath, dirMap)
  );
  const extSet = /* @__PURE__ */ new Set();
  for (const f of folders) collectExtensions(f, extSet);
  const allExtensions = [...extSet].sort();
  const counts = countAll(folders);
  onProgress?.({
    phase: "done",
    totalFiles: counts.totalFiles,
    processedFiles: counts.totalFiles,
    totalFolders: counts.totalFolders,
    message: `Found ${counts.totalFolders} folders, ${counts.totalFiles} files, ${counts.totalDocuments} documents`
  });
  return {
    rootPath,
    folders,
    scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
    allExtensions,
    ...counts
  };
}
class FolderWatcher {
  watcher = null;
  debounceTimer = null;
  debounceMs = 400;
  rootPath = null;
  onIndexUpdate = null;
  onProgress = null;
  onError = null;
  /**
   * Start watching the given root folder.
   * Calls onIndexUpdate whenever a rescan produces a new index.
   */
  start(rootPath, onIndexUpdate, onProgress, onError) {
    this.stop();
    this.rootPath = rootPath;
    this.onIndexUpdate = onIndexUpdate;
    this.onProgress = onProgress;
    this.onError = onError;
    try {
      this.watcher = chokidar.watch(rootPath, {
        persistent: true,
        ignoreInitial: true,
        // Initial scan is done separately
        followSymlinks: false,
        depth: 99,
        // Fully recursive
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100
        },
        // Ignore common noise directories
        ignored: [
          /(^|[/\\])\../,
          // dotfiles
          /node_modules/,
          /\.git/
        ]
      });
      this.watcher.on("add", (filePath) => this.handleEvent("add", filePath)).on("change", (filePath) => this.handleEvent("change", filePath)).on("unlink", (filePath) => this.handleEvent("unlink", filePath)).on("addDir", (dirPath) => this.handleEvent("addDir", dirPath)).on("unlinkDir", (dirPath) => this.handleEvent("unlinkDir", dirPath)).on("error", (error) => {
        console.error("[Watcher] Error:", error);
        this.onError?.(`Watcher error: ${error.message}`);
      });
      console.log(`[Watcher] Started watching: ${rootPath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Watcher] Failed to start:", msg);
      this.onError?.(`Failed to start file watcher: ${msg}`);
    }
  }
  /**
   * Stop the watcher and clean up.
   */
  stop() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close().catch((err) => {
        console.warn("[Watcher] Error during close:", err);
      });
      this.watcher = null;
    }
    this.rootPath = null;
    console.log("[Watcher] Stopped");
  }
  /**
   * Handle a filesystem event — schedule a debounced rescan.
   */
  handleEvent(event, eventPath) {
    console.log(`[Watcher] Event: ${event} → ${eventPath}`);
    this.scheduleRescan();
  }
  /**
   * Schedule a debounced rescan. Multiple rapid events get coalesced.
   */
  scheduleRescan() {
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
  async triggerRescan() {
    if (!this.rootPath || !this.onIndexUpdate) return;
    console.log("[Watcher] Triggering rescan...");
    try {
      const index = await scanRootFolder(this.rootPath, this.onProgress ?? void 0);
      this.onIndexUpdate(index);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Watcher] Rescan failed:", msg);
      this.onError?.(`Rescan failed: ${msg}`);
    }
  }
  get isActive() {
    return this.watcher !== null;
  }
}
const folderWatcher = new FolderWatcher();
const defaults = {
  lastRootPath: null,
  theme: "dark",
  windowBounds: void 0
};
function getSettingsPath() {
  return path.join(electron.app.getPath("userData"), "settings.json");
}
function getSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), "utf-8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}
function saveSettings(partial) {
  const current = getSettings();
  const updated = { ...current, ...partial };
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("[Settings] Failed to save settings:", err);
  }
}
let mainWindow = null;
function createWindow() {
  const settings = getSettings();
  const bounds = settings.windowBounds ?? { width: 1280, height: 800 };
  mainWindow = new electron.BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    title: "Document Revision Index",
    backgroundColor: "#18181b",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    // Frameless-style but keep native title bar for resize/snap support
    frame: true,
    show: false
    // Show after content loads to avoid flash
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  const saveBounds = () => {
    if (!mainWindow) return;
    const { x, y, width, height } = mainWindow.getBounds();
    saveSettings({ windowBounds: { x, y, width, height } });
  };
  mainWindow.on("moved", saveBounds);
  mainWindow.on("resized", saveBounds);
  mainWindow.on("closed", () => {
    mainWindow = null;
    folderWatcher.stop();
  });
}
electron.app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  folderWatcher.stop();
  if (process.platform !== "darwin") electron.app.quit();
});
function registerIpcHandlers() {
  electron.ipcMain.handle(IPC.SELECT_FOLDER, async () => {
    if (!mainWindow) return null;
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Document Root Folder"
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  electron.ipcMain.handle(
    IPC.OPEN_FILE,
    async (_event, filePath) => {
      try {
        await fs.promises.access(filePath, fs.constants.R_OK);
        const error = await electron.shell.openPath(filePath);
        if (error) {
          return { success: false, error };
        }
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }
  );
  electron.ipcMain.handle(IPC.GET_SETTINGS, () => {
    return getSettings();
  });
  electron.ipcMain.handle(IPC.SAVE_SETTINGS, (_event, partial) => {
    saveSettings(partial);
  });
  electron.ipcMain.handle(IPC.SCAN_FOLDER, async (_event, rootPath) => {
    const onProgress = (progress) => {
      mainWindow?.webContents.send(IPC.SCAN_PROGRESS, progress);
    };
    return scanRootFolder(rootPath, onProgress);
  });
  electron.ipcMain.on(IPC.START_WATCHER, (_event, rootPath) => {
    folderWatcher.start(
      rootPath,
      // onIndexUpdate
      (index) => {
        mainWindow?.webContents.send(IPC.INDEX_UPDATED, index);
      },
      // onProgress
      (progress) => {
        mainWindow?.webContents.send(IPC.SCAN_PROGRESS, progress);
      },
      // onError
      (error) => {
        mainWindow?.webContents.send(IPC.WATCHER_ERROR, error);
      }
    );
  });
  electron.ipcMain.on(IPC.STOP_WATCHER, () => {
    folderWatcher.stop();
  });
}
