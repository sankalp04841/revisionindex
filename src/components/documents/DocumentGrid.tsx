/**
 * DocumentGrid.tsx
 *
 * The main content area. Shows grouped documents per folder,
 * with folder section headers, document cards, and unversioned file rows.
 */

import { useMemo } from 'react';
import { FolderOpen, FileText, Search } from 'lucide-react';
import { useAppStore } from '../../store/documentStore';
import { useSearch } from '../../hooks/useSearch';
import { DocumentCard } from './DocumentCard';
import { getFileTypeInfo } from '../../utils/fileIcons';
import { formatDate } from '../../utils/formatters';
import type { Document, FolderIndex, FileEntry } from '../../../shared/types';

// ─────────────────────────────────────────────────────────────
// Unversioned file row
// ─────────────────────────────────────────────────────────────

function UnversionedRow({ file }: { file: FileEntry }) {
  const { addToast } = useAppStore();
  const info = getFileTypeInfo(file.extension);

  const handleOpen = async () => {
    try {
      const result = await window.electronAPI.openFile(file.filePath);
      if (!result.success) addToast('error', result.error ?? 'Failed to open file');
    } catch {
      addToast('error', 'Failed to open file');
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-700/30
                    transition-colors group cursor-default">
      <FileText className="w-3.5 h-3.5 text-surface-600 flex-shrink-0" />
      <span className={`badge text-[10px] ${info.bgClass} ${info.colorClass} border-transparent flex-shrink-0`}>
        {info.label || 'FILE'}
      </span>
      <span className="text-xs font-mono text-surface-400 flex-1 truncate">{file.fileName}</span>
      <span className="text-xs text-surface-600 badge-surface flex-shrink-0">UNVERSIONED</span>
      <span className="text-xs text-surface-600 flex-shrink-0 hidden sm:block">{formatDate(file.modifiedAt)}</span>
      <button
        onClick={handleOpen}
        className="btn-ghost text-xs h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        Open
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sort documents
// ─────────────────────────────────────────────────────────────

function sortDocuments(docs: Document[], order: string): Document[] {
  return [...docs].sort((a, b) => {
    switch (order) {
      case 'name-asc':  return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'rev-desc':  return (b.latestRevisionNumber ?? -1) - (a.latestRevisionNumber ?? -1);
      case 'rev-asc':   return (a.latestRevisionNumber ?? -1) - (b.latestRevisionNumber ?? -1);
      case 'modified-desc': {
        const getLatest = (doc: Document) =>
          doc.revisions.flatMap((r) => r.files).reduce((max, f) =>
            f.modifiedAt > max ? f.modifiedAt : max, '');
        return getLatest(b).localeCompare(getLatest(a));
      }
      default: return 0;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Folder section
// ─────────────────────────────────────────────────────────────

interface FolderSectionProps {
  folder: FolderIndex;
  documents: Document[];
  /** Whether this is the directly-selected folder (show unversioned files) */
  isRoot?: boolean;
}

function FolderSection({ folder, documents, isRoot }: FolderSectionProps) {
  const { sortOrder } = useAppStore();
  const sorted = useMemo(() => sortDocuments(documents, sortOrder), [documents, sortOrder]);

  // Only show unversioned files if this is the directly-selected (or only) folder
  const unversioned = isRoot !== false ? folder.unversionedFiles : [];

  if (sorted.length === 0 && unversioned.length === 0) return null;

  return (
    <section className="mb-8 animate-fade-in">
      {/* Folder header */}
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-surface-700/40">
        <FolderOpen className="w-4 h-4 text-accent-500 flex-shrink-0" />
        <h2 className="text-sm font-semibold text-surface-200">{folder.folderName}</h2>
        {folder.relativePath && folder.relativePath !== '.' && (
          <span className="text-xs text-surface-600 font-mono ml-1 truncate max-w-xs" title={folder.relativePath}>
            {folder.relativePath}
          </span>
        )}
        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          {sorted.length > 0 && (
            <span className="text-xs text-surface-600">
              {sorted.length} doc{sorted.length !== 1 ? 's' : ''}
            </span>
          )}
          {unversioned.length > 0 && (
            <span className="text-xs text-surface-700">
              +{unversioned.length} unversioned
            </span>
          )}
        </div>
      </div>

      {/* Document cards grid */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mb-4">
          {sorted.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}

      {/* Unversioned files — collapsible */}
      {unversioned.length > 0 && (
        <details className="mt-2 group/details">
          <summary className="flex items-center gap-2 text-xs text-surface-500 cursor-pointer
                              hover:text-surface-300 transition-colors list-none select-none
                              py-1 pl-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{unversioned.length} unversioned file{unversioned.length !== 1 ? 's' : ''}</span>
            <span className="text-surface-700 text-[10px] ml-1">(click to expand)</span>
          </summary>
          <div className="mt-2 pl-2 border-l-2 border-surface-700/40 space-y-0.5">
            {unversioned.map((f) => (
              <UnversionedRow key={f.filePath} file={f} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function DocumentGrid() {
  const { searchQuery, activeExtFilter, appIndex, selectedFolderPath } = useAppStore();
  const results = useSearch();

  // Count total visible documents
  const totalVisible = results.reduce((s, r) => s + r.documents.length, 0);
  const hasFilter = searchQuery.trim() || activeExtFilter;

  if (!appIndex) return null;

  if (results.length === 0 || totalVisible === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-surface-500 select-none gap-3">
        <Search className="w-10 h-10 text-surface-700" />
        <p className="text-sm">
          {hasFilter ? 'No documents match your search.' : 'No documents found in this folder.'}
        </p>
        {hasFilter && (
          <p className="text-xs text-surface-600">Try a different search term or filter.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      {/* Results banner when filtering */}
      {hasFilter && (
        <div className="flex items-center gap-2 mb-5 text-xs text-surface-400
                        bg-surface-800/60 border border-surface-700/40 rounded-lg px-3 py-2">
          <Search className="w-3.5 h-3.5 text-accent-500 flex-shrink-0" />
          <span>
            <strong className="text-surface-200">{totalVisible}</strong> result{totalVisible !== 1 ? 's' : ''}
            {searchQuery.trim() && (
              <> for <strong className="text-surface-200">"{searchQuery.trim()}"</strong></>
            )}
            {activeExtFilter && (
              <> · <strong className="text-surface-200">.{activeExtFilter}</strong> only</>
            )}
          </span>
        </div>
      )}

      {results.map(({ folder, documents }, i) => (
        <FolderSection
          key={folder.folderPath}
          folder={folder}
          documents={documents}
          isRoot={i === 0 || !!selectedFolderPath}
        />
      ))}
    </div>
  );
}
