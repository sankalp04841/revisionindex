// ─────────────────────────────────────────────────────────────
// Shared types between main process and renderer
// ─────────────────────────────────────────────────────────────

export interface FileEntry {
  /** Absolute path to the file */
  filePath: string;
  /** Just the filename with extension e.g. "Drawing -3.pdf" */
  fileName: string;
  /** Normalised lowercase extension without dot e.g. "pdf" */
  extension: string;
  /** Last-modified date */
  modifiedAt: string; // ISO string (serialisable across IPC)
  /** Size in bytes */
  size: number;
  /** Path of the containing directory (absolute) */
  directoryPath: string;
  /** Path relative to the selected root */
  relativePath: string;
}

export interface Revision {
  revisionNumber: number;
  /** Multiple files can share the same revision number with different extensions */
  files: FileEntry[];
}

export interface Document {
  /** Deterministic ID based on directoryPath + name */
  id: string;
  /** Parsed document name (without revision suffix) */
  name: string;
  /** Absolute path of the containing directory */
  directoryPath: string;
  /** Directory name (for display) */
  directoryName: string;
  /** Path relative to the selected root */
  directoryRelativePath: string;
  /** All discovered revisions, sorted numerically ascending */
  revisions: Revision[];
  /** Highest revision number found (null if no versioned files) */
  latestRevisionNumber: number | null;
  /** Revision numbers that are missing in the sequence */
  missingRevisions: number[];
  /** All distinct extensions used by this document */
  extensions: string[];
}

export interface FolderIndex {
  /** Absolute path */
  folderPath: string;
  /** Just the folder name */
  folderName: string;
  /** Path relative to selected root */
  relativePath: string;
  /** Versioned documents in this directory (not subdirs) */
  documents: Document[];
  /** Files that don't match the revision naming convention */
  unversionedFiles: FileEntry[];
  /** Sub-folders (recursive) */
  children: FolderIndex[];
  /** Total document count including all descendants */
  totalDocuments: number;
  /** Total unversioned count including all descendants */
  totalUnversioned: number;
}

export interface AppIndex {
  rootPath: string;
  /** Top-level factory/project folders */
  folders: FolderIndex[];
  scannedAt: string;
  /** All extensions discovered across the entire tree */
  allExtensions: string[];
  totalDocuments: number;
  totalFiles: number;
  totalFolders: number;
}

export interface AppSettings {
  lastRootPath: string | null;
  theme: 'dark' | 'light';
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScanProgress {
  phase: 'scanning' | 'parsing' | 'grouping' | 'done' | 'error';
  totalFiles: number;
  processedFiles: number;
  totalFolders: number;
  message: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// IPC channel names (shared constant to avoid typos)
// ─────────────────────────────────────────────────────────────
export const IPC = {
  SELECT_FOLDER: 'select-folder',
  OPEN_FILE: 'open-file',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  SCAN_FOLDER: 'scan-folder',
  START_WATCHER: 'start-watcher',
  STOP_WATCHER: 'stop-watcher',
  INDEX_UPDATED: 'index-updated',
  SCAN_PROGRESS: 'scan-progress',
  WATCHER_ERROR: 'watcher-error'
} as const;
