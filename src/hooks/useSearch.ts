/**
 * useSearch.ts
 *
 * Filters documents based on the current search query and extension filter.
 * Search is case-insensitive and matches folder names, document names, and filenames.
 */

import { useMemo } from 'react';
import { useAppStore, collectAllDocuments } from '../store/documentStore';
import type { FolderIndex, Document } from '../../shared/types';

export interface SearchResult {
  /** The folder these documents belong to (may be a child folder) */
  folder: FolderIndex;
  documents: Document[];
}

export function useSearch(): SearchResult[] {
  const { appIndex, searchQuery, activeExtFilter, selectedFolderPath, sortOrder } = useAppStore();

  return useMemo(() => {
    if (!appIndex) return [];

    const query = searchQuery.trim().toLowerCase();
    const extFilter = activeExtFilter?.toLowerCase() ?? null;

    // ── Predicates ────────────────────────────────────────────
    function docMatchesQuery(doc: Document): boolean {
      if (!query) return true;
      if (doc.name.toLowerCase().includes(query)) return true;
      if (doc.directoryName.toLowerCase().includes(query)) return true;
      if (doc.directoryRelativePath.toLowerCase().includes(query)) return true;
      for (const rev of doc.revisions) {
        for (const file of rev.files) {
          if (file.fileName.toLowerCase().includes(query)) return true;
        }
      }
      return false;
    }

    function docMatchesExt(doc: Document): boolean {
      if (!extFilter) return true;
      return doc.extensions.includes(extFilter);
    }

    function folderMatchesQuery(folder: FolderIndex): boolean {
      if (!query) return true;
      return folder.folderName.toLowerCase().includes(query) ||
             folder.relativePath.toLowerCase().includes(query);
    }

    // ── Collect matching documents from a folder tree ────────

    /**
     * Returns all documents (from the folder and all descendants)
     * that pass the query + ext filter.
     */
    function getMatchingDocs(folder: FolderIndex): Document[] {
      const all = collectAllDocuments(folder);
      return all.filter((d) => docMatchesQuery(d) && docMatchesExt(d));
    }

    /**
     * Recursively collect {folder, documents} pairs for every folder
     * that has matching documents (or whose name matches the query when
     * showing all content).
     */
    function collectResults(
      folders: FolderIndex[],
      filterByFolderPath: string | null
    ): SearchResult[] {
      const results: SearchResult[] = [];

      for (const folder of folders) {
        // If a specific folder is selected, only process that subtree
        if (filterByFolderPath) {
          const isSelf = folder.folderPath === filterByFolderPath;
          const isAncestor =
            filterByFolderPath.startsWith(folder.folderPath + '\\') ||
            filterByFolderPath.startsWith(folder.folderPath + '/');

          if (!isSelf && !isAncestor) continue;

          if (isSelf) {
            // Show this folder's own documents + all descendant documents
            const matchingDocs = getMatchingDocs(folder);
            if (matchingDocs.length > 0 || (!query && !extFilter)) {
              results.push({ folder, documents: matchingDocs });
            }
            continue; // Don't recurse — getMatchingDocs already covers descendants
          }

          // Ancestor — recurse to find the selected child
          results.push(...collectResults(folder.children, filterByFolderPath));
          continue;
        }

        // No specific folder selected — show all matching content
        if (query || extFilter) {
          // Search/filter mode: group by the folder each document lives in
          // Show results grouped by their immediate parent folder
          const ownMatchingDocs = folder.documents.filter(
            (d) => docMatchesQuery(d) && docMatchesExt(d)
          );
          if (ownMatchingDocs.length > 0) {
            results.push({ folder, documents: ownMatchingDocs });
          }
          // Also recurse into children
          results.push(...collectResults(folder.children, null));
        } else {
          // Default view: show each top-level folder with all its documents
          const allDocs = collectAllDocuments(folder);
          if (allDocs.length > 0 || folder.unversionedFiles.length > 0) {
            results.push({ folder, documents: allDocs });
          }
        }
      }

      return results;
    }

    return collectResults(appIndex.folders, selectedFolderPath);
  }, [appIndex, searchQuery, activeExtFilter, selectedFolderPath, sortOrder]);
}
