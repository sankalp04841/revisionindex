/**
 * scanner.ts
 *
 * Recursively scans the selected root folder and builds a complete AppIndex.
 *
 * Architecture:
 *   Root folder
 *     └── top-level subdirs = factory/project folders
 *           └── recursively scan all files in each subtree
 *
 * The root folder itself is NOT treated as a factory folder.
 * Each immediate child of the root is a top-level factory/project folder.
 *
 * Files at the root level are ignored (not common in the expected structure).
 */

import fs from 'fs';
import path from 'path';
import type { FileEntry, FolderIndex, AppIndex, ScanProgress } from '../../shared/types';
import { groupFilesIntoDocuments } from './grouper';

type ProgressCallback = (progress: ScanProgress) => void;

interface RawDirEntry {
  dirPath: string;
  dirName: string;
  relativePath: string;
  files: FileEntry[];
}

/**
 * Recursively collect all directories and their files starting at `dirPath`.
 */
async function collectDirectory(
  dirPath: string,
  rootPath: string,
  entries: RawDirEntry[]
): Promise<void> {
  let dirents: fs.Dirent[];
  try {
    dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    // Permission denied or other read error — skip this directory
    console.warn(`[Scanner] Cannot read directory: ${dirPath}`, err);
    return;
  }

  const files: FileEntry[] = [];

  for (const dirent of dirents) {
    const fullPath = path.join(dirPath, dirent.name);
    try {
      if (dirent.isDirectory()) {
        // Recurse into subdirectory
        await collectDirectory(fullPath, rootPath, entries);
      } else if (dirent.isFile()) {
        const stat = await fs.promises.stat(fullPath);
        const ext = path.extname(dirent.name);
        const dotIndex = dirent.name.lastIndexOf('.');
        files.push({
          filePath: fullPath,
          fileName: dirent.name,
          extension: ext ? ext.slice(1).toLowerCase() : '',
          modifiedAt: stat.mtime.toISOString(),
          size: stat.size,
          directoryPath: dirPath,
          relativePath: path.relative(rootPath, fullPath)
        });
      }
      // Ignore symlinks, block devices, etc.
    } catch (err) {
      console.warn(`[Scanner] Cannot stat: ${fullPath}`, err);
    }
  }

  const relativePath = path.relative(rootPath, dirPath);
  const dirName = path.basename(dirPath);

  entries.push({
    dirPath,
    dirName,
    relativePath: relativePath || '.',
    files
  });
}

/**
 * Build a FolderIndex tree for a directory and all its descendants.
 */
function buildFolderTree(
  dirPath: string,
  rootPath: string,
  dirMap: Map<string, RawDirEntry>
): FolderIndex {
  const entry = dirMap.get(dirPath);
  const dirName = path.basename(dirPath);
  const relativePath = path.relative(rootPath, dirPath);

  // Find immediate child directories
  const childDirs: string[] = [];
  for (const [p] of dirMap.entries()) {
    if (
      p !== dirPath &&
      path.dirname(p) === dirPath
    ) {
      childDirs.push(p);
    }
  }
  childDirs.sort();

  const children: FolderIndex[] = childDirs.map((childPath) =>
    buildFolderTree(childPath, rootPath, dirMap)
  );

  const files = entry?.files ?? [];
  const { documents, unversionedFiles } = groupFilesIntoDocuments(
    files,
    dirPath,
    dirName,
    relativePath
  );

  const totalDocuments =
    documents.length + children.reduce((sum, c) => sum + c.totalDocuments, 0);
  const totalUnversioned =
    unversionedFiles.length + children.reduce((sum, c) => sum + c.totalUnversioned, 0);

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

/**
 * Recursively collect all extensions from a folder tree.
 */
function collectExtensions(folder: FolderIndex, set: Set<string>): void {
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

/**
 * Count all docs, files, folders recursively.
 */
function countAll(folders: FolderIndex[]): {
  totalDocuments: number;
  totalFiles: number;
  totalFolders: number;
} {
  let totalDocuments = 0;
  let totalFiles = 0;
  let totalFolders = 0;

  function traverse(f: FolderIndex): void {
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

/**
 * Main scan entry point.
 *
 * @param rootPath  The selected root folder path
 * @param onProgress  Optional progress callback
 * @returns  A complete AppIndex
 */
export async function scanRootFolder(
  rootPath: string,
  onProgress?: ProgressCallback
): Promise<AppIndex> {
  onProgress?.({
    phase: 'scanning',
    totalFiles: 0,
    processedFiles: 0,
    totalFolders: 0,
    message: 'Discovering folders and files...'
  });

  // Get top-level children of root
  let topLevelDirents: fs.Dirent[];
  try {
    topLevelDirents = await fs.promises.readdir(rootPath, { withFileTypes: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read root folder: ${msg}`);
  }

  const topLevelDirs = topLevelDirents
    .filter((d) => d.isDirectory())
    .map((d) => path.join(rootPath, d.name))
    .sort();

  // Collect all entries recursively
  const allEntries: RawDirEntry[] = [];

  for (const dir of topLevelDirs) {
    await collectDirectory(dir, rootPath, allEntries);
  }

  onProgress?.({
    phase: 'parsing',
    totalFiles: allEntries.reduce((s, e) => s + e.files.length, 0),
    processedFiles: 0,
    totalFolders: allEntries.length,
    message: 'Parsing filenames and revision numbers...'
  });

  // Build a map from dirPath → RawDirEntry for fast lookup
  const dirMap = new Map<string, RawDirEntry>();
  for (const entry of allEntries) {
    dirMap.set(entry.dirPath, entry);
  }

  onProgress?.({
    phase: 'grouping',
    totalFiles: allEntries.reduce((s, e) => s + e.files.length, 0),
    processedFiles: 0,
    totalFolders: allEntries.length,
    message: 'Grouping documents by revision...'
  });

  // Build top-level folder trees
  const folders: FolderIndex[] = topLevelDirs.map((dirPath) =>
    buildFolderTree(dirPath, rootPath, dirMap)
  );

  // Collect all extensions
  const extSet = new Set<string>();
  for (const f of folders) collectExtensions(f, extSet);
  const allExtensions = [...extSet].sort();

  const counts = countAll(folders);

  onProgress?.({
    phase: 'done',
    totalFiles: counts.totalFiles,
    processedFiles: counts.totalFiles,
    totalFolders: counts.totalFolders,
    message: `Found ${counts.totalFolders} folders, ${counts.totalFiles} files, ${counts.totalDocuments} documents`
  });

  return {
    rootPath,
    folders,
    scannedAt: new Date().toISOString(),
    allExtensions,
    ...counts
  };
}
