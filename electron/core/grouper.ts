/**
 * grouper.ts
 *
 * Takes a flat list of FileEntry objects for a single directory and groups
 * them into Documents (versioned) and unversioned FileEntry arrays.
 *
 * Document identity = directoryPath + documentName  (case-sensitive)
 * This ensures the same document name in two different directories
 * produces two separate Document objects.
 */

import { createHash } from 'crypto';
import type { FileEntry, Document, Revision } from '../../shared/types';
import { parseFileName } from './parser';

/**
 * Generate a stable, deterministic document ID from its directory and name.
 */
export function makeDocumentId(directoryPath: string, documentName: string): string {
  return createHash('sha1')
    .update(directoryPath + '\x00' + documentName)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Compute missing revisions between the minimum and maximum discovered
 * revision numbers.  Revisions before the minimum are NOT considered missing.
 *
 * e.g. revisions [3, 5]  → missing = [4]
 *      revisions [0, 1, 3] → missing = [2]
 *      revisions [0, 1, 2] → missing = []
 */
export function computeMissingRevisions(revisionNumbers: number[]): number[] {
  if (revisionNumbers.length === 0) return [];
  const sorted = [...revisionNumbers].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const missing: number[] = [];
  for (let i = min + 1; i < max; i++) {
    if (!sorted.includes(i)) {
      missing.push(i);
    }
  }
  return missing;
}

/**
 * Group a flat list of FileEntry objects into Documents + unversionedFiles.
 *
 * @param files          FileEntry objects for files in a single directory
 * @param directoryPath  Absolute path of the directory
 * @param directoryName  Display name (just the folder name)
 * @param directoryRelativePath  Path relative to root
 */
export function groupFilesIntoDocuments(
  files: FileEntry[],
  directoryPath: string,
  directoryName: string,
  directoryRelativePath: string
): { documents: Document[]; unversionedFiles: FileEntry[] } {
  // Map: documentName → map of revisionNumber → FileEntry[]
  const revisionMap = new Map<string, Map<number, FileEntry[]>>();
  const unversionedFiles: FileEntry[] = [];

  for (const file of files) {
    const result = parseFileName(file.fileName);
    if (result.isVersioned) {
      if (!revisionMap.has(result.documentName)) {
        revisionMap.set(result.documentName, new Map());
      }
      const revMap = revisionMap.get(result.documentName)!;
      if (!revMap.has(result.revisionNumber)) {
        revMap.set(result.revisionNumber, []);
      }
      revMap.get(result.revisionNumber)!.push(file);
    } else {
      unversionedFiles.push(file);
    }
  }

  const documents: Document[] = [];

  for (const [docName, revMap] of revisionMap.entries()) {
    // Build sorted revisions array (ascending by revision number)
    const revisions: Revision[] = [...revMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([revNum, files]) => ({
        revisionNumber: revNum,
        files
      }));

    const revisionNumbers = revisions.map((r) => r.revisionNumber);
    const latestRevisionNumber =
      revisionNumbers.length > 0 ? Math.max(...revisionNumbers) : null;
    const missingRevisions = computeMissingRevisions(revisionNumbers);

    // Collect all distinct extensions
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

  // Sort documents alphabetically by name
  documents.sort((a, b) => a.name.localeCompare(b.name));

  return { documents, unversionedFiles };
}
