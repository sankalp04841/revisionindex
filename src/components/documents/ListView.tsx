/**
 * ListView.tsx
 *
 * Flat, grouped document list view.
 *
 * Layout:
 *   FACTORY A (sticky header)
 *     Document Name .............. REV N
 *     Document Name .............. REV N
 *   FACTORY B (sticky header)
 *     ...
 *
 * Clicking a row opens the detail drawer.
 * Double-clicking opens the latest revision file.
 */

import { useMemo, useCallback } from 'react';
import {
  AlertTriangle, FolderOpen, FileText,
  ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { useAppStore, collectAllDocuments } from '../../store/documentStore';
import type { SortField } from '../../store/documentStore';
import { getFileTypeInfo } from '../../utils/fileIcons';
import type { Document, FolderIndex } from '../../../shared/types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface FlatGroup {
  factoryName: string;
  factoryFolder: FolderIndex;
  documents: Document[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function sortDocs(docs: Document[], order: SortField): Document[] {
  return [...docs].sort((a, b) => {
    switch (order) {
      case 'name-asc':     return a.name.localeCompare(b.name);
      case 'name-desc':    return b.name.localeCompare(a.name);
      case 'rev-desc':     return (b.latestRevisionNumber ?? -1) - (a.latestRevisionNumber ?? -1);
      case 'rev-asc':      return (a.latestRevisionNumber ?? -1) - (b.latestRevisionNumber ?? -1);
      case 'modified-desc': {
        const latest = (d: Document) =>
          d.revisions.flatMap(r => r.files).reduce((m, f) => f.modifiedAt > m ? f.modifiedAt : m, '');
        return latest(b).localeCompare(latest(a));
      }
      case 'factory-asc':  return 0; // already grouped by factory, within-group use name-asc
      default:             return 0;
    }
  });
}

// Filter a doc against the query (same rules as grid)
function docMatchesQuery(doc: Document, query: string): boolean {
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

// ─────────────────────────────────────────────────────────────
// Sort header button
// ─────────────────────────────────────────────────────────────

interface SortButtonProps {
  label: string;
  ascField: SortField;
  descField: SortField;
  current: SortField;
  onSort: (f: SortField) => void;
}

function SortButton({ label, ascField, descField, current, onSort }: SortButtonProps) {
  const isAsc = current === ascField;
  const isDesc = current === descField;
  const isActive = isAsc || isDesc;

  const handleClick = () => {
    if (!isActive || isDesc) onSort(ascField);
    else onSort(descField);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1 text-xs font-semibold tracking-wide uppercase
        transition-colors select-none
        ${isActive ? 'text-accent-300' : 'text-surface-500 hover:text-surface-300'}
      `}
    >
      {label}
      {isActive
        ? isAsc
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
        : <ArrowUpDown className="w-3 h-3 opacity-40" />
      }
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Document row
// ─────────────────────────────────────────────────────────────

interface DocRowProps {
  doc: Document;
  onSelect: (doc: Document) => void;
  onDoubleClick: (doc: Document) => void;
}

function DocRow({ doc, onSelect, onDoubleClick }: DocRowProps) {
  const isUnversioned = doc.revisions.length === 0;
  const latestRev = doc.latestRevisionNumber;
  const hasMissing = doc.missingRevisions.length > 0;

  // Extension badges (up to 3)
  const exts = doc.extensions.slice(0, 3);

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={() => onSelect(doc)}
      onDoubleClick={() => onDoubleClick(doc)}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(doc); }}
      className="
        group flex items-center gap-3 px-5 py-2.5
        border-b border-surface-800/70 last:border-0
        hover:bg-surface-800/60 active:bg-surface-800
        cursor-pointer transition-colors duration-100 select-none
        focus:outline-none focus:bg-surface-800/60
      "
    >
      {/* File-type badges */}
      <div className="flex items-center gap-1 flex-shrink-0 w-[72px] justify-end">
        {exts.map((ext) => {
          const info = getFileTypeInfo(ext);
          return (
            <span
              key={ext}
              className={`badge text-[9px] px-1.5 py-0 ${info.bgClass} ${info.colorClass} border-transparent`}
            >
              {info.label}
            </span>
          );
        })}
        {doc.extensions.length > 3 && (
          <span className="text-[9px] text-surface-600">+{doc.extensions.length - 3}</span>
        )}
      </div>

      {/* Document name */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm text-surface-100 truncate font-medium group-hover:text-white transition-colors">
          {doc.name}
        </span>
        {hasMissing && (
          <AlertTriangle
            className="w-3 h-3 text-amber-500/70 flex-shrink-0"
            title={`Missing revisions: ${doc.missingRevisions.join(', ')}`}
          />
        )}
        {isUnversioned && (
          <span className="badge-surface text-[9px] flex-shrink-0">UNVERSIONED</span>
        )}
      </div>

      {/* Relative path (dim, hidden when narrow) */}
      <div className="hidden xl:block w-48 flex-shrink-0">
        {doc.directoryRelativePath && (
          <span
            className="text-[11px] text-surface-600 font-mono truncate block"
            title={doc.directoryRelativePath}
          >
            {doc.directoryRelativePath}
          </span>
        )}
      </div>

      {/* Revision badge */}
      <div className="flex-shrink-0 w-20 text-right">
        {isUnversioned ? (
          <span className="text-xs text-surface-600">—</span>
        ) : (
          <span className={`
            text-xs font-bold font-mono tabular-nums
            ${latestRev !== null && latestRev !== undefined
              ? 'text-accent-300'
              : 'text-surface-500'}
          `}>
            REV {latestRev ?? '?'}
          </span>
        )}
      </div>

      {/* Hover caret */}
      <div className="w-4 flex-shrink-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-surface-500 text-xs">›</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Factory group header (sticky)
// ─────────────────────────────────────────────────────────────

function FactoryHeader({
  folder,
  docCount,
}: {
  folder: FolderIndex;
  docCount: number;
}) {
  return (
    <div
      className="
        sticky top-0 z-10
        flex items-center gap-3 px-5 py-2
        bg-surface-900/95 backdrop-blur-sm
        border-b border-t border-surface-700/60
        first-of-type:border-t-0
      "
      role="rowgroup"
    >
      <FolderOpen className="w-3.5 h-3.5 text-accent-500 flex-shrink-0" />
      <span className="text-xs font-bold tracking-widest uppercase text-surface-200 flex-1">
        {folder.folderName}
      </span>
      <span className="text-xs text-surface-600 tabular-nums">
        {docCount} document{docCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Table header row (column labels + sort buttons)
// ─────────────────────────────────────────────────────────────

function TableHeader({ listSortOrder, setListSortOrder }: {
  listSortOrder: SortField;
  setListSortOrder: (f: SortField) => void;
}) {
  return (
    <div className="
      flex items-center gap-3 px-5 py-2
      bg-surface-900 border-b border-surface-700/60
      text-xs text-surface-500 flex-shrink-0
    ">
      {/* Type column spacer */}
      <div className="w-[72px] flex-shrink-0" />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <SortButton
          label="Document"
          ascField="name-asc"
          descField="name-desc"
          current={listSortOrder}
          onSort={setListSortOrder}
        />
      </div>

      {/* Path column */}
      <div className="hidden xl:block w-48 flex-shrink-0">
        <SortButton
          label="Path"
          ascField="factory-asc"
          descField="factory-asc"
          current={listSortOrder}
          onSort={setListSortOrder}
        />
      </div>

      {/* Revision */}
      <div className="w-20 flex-shrink-0 flex justify-end">
        <SortButton
          label="Rev"
          ascField="rev-asc"
          descField="rev-desc"
          current={listSortOrder}
          onSort={setListSortOrder}
        />
      </div>

      {/* Caret spacer */}
      <div className="w-4 flex-shrink-0" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function ListView() {
  const {
    appIndex,
    searchQuery,
    activeExtFilter,
    listSortOrder,
    setListSortOrder,
    selectDocument,
    addToast,
  } = useAppStore();

  // Build flat groups from appIndex whenever it changes
  const groups: FlatGroup[] = useMemo(() => {
    if (!appIndex) return [];

    const query = searchQuery.trim().toLowerCase();
    const extFilter = activeExtFilter?.toLowerCase() ?? null;

    return appIndex.folders.map((topFolder) => {
      // Collect all docs from this top-level folder and all descendants
      let allDocs = collectAllDocuments(topFolder);

      // Apply filters
      if (query) {
        allDocs = allDocs.filter((d) => {
          if (docMatchesQuery(d, query)) return true;
          // Also match if the factory/folder name matches
          if (topFolder.folderName.toLowerCase().includes(query)) return true;
          return false;
        });
      }
      if (extFilter) {
        allDocs = allDocs.filter((d) => d.extensions.includes(extFilter));
      }

      // Sort within group (factory-asc behaves like name-asc within a group)
      const effectiveSort = listSortOrder === 'factory-asc' ? 'name-asc' : listSortOrder;
      allDocs = sortDocs(allDocs, effectiveSort as SortField);

      return {
        factoryName: topFolder.folderName,
        factoryFolder: topFolder,
        documents: allDocs,
      };
    })
    // When sorting by factory: sort the groups themselves alphabetically
    .sort((a, b) => {
      if (listSortOrder === 'factory-asc') {
        return a.factoryName.localeCompare(b.factoryName);
      }
      return 0; // preserve index order for other sort modes
    })
    .filter((g) => g.documents.length > 0);
  }, [appIndex, searchQuery, activeExtFilter, listSortOrder]);

  const totalVisible = groups.reduce((s, g) => s + g.documents.length, 0);
  const hasFilter = searchQuery.trim() || activeExtFilter;

  const handleSelect = useCallback((doc: Document) => {
    selectDocument(doc);
  }, [selectDocument]);

  const handleDoubleClick = useCallback(async (doc: Document) => {
    // Open the latest revision's first file
    const latestRev = doc.revisions.find(
      (r) => r.revisionNumber === doc.latestRevisionNumber
    );
    const file = latestRev?.files[0];
    if (!file) {
      addToast('warning', 'No file found for latest revision.');
      return;
    }
    try {
      const result = await window.electronAPI.openFile(file.filePath);
      if (!result.success) addToast('error', result.error ?? 'Failed to open file');
    } catch {
      addToast('error', 'Failed to open file');
    }
  }, [addToast]);

  // ── Empty states ────────────────────────────────────────────

  if (!appIndex) return null;

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-surface-500 select-none">
        <FileText className="w-10 h-10 text-surface-700" />
        <p className="text-sm">
          {hasFilter ? 'No documents match your search.' : 'No documents found.'}
        </p>
        {hasFilter && (
          <p className="text-xs text-surface-600">Try a different search term or filter.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" role="table" aria-label="Document list">
      {/* Column header */}
      <TableHeader listSortOrder={listSortOrder} setListSortOrder={setListSortOrder} />

      {/* Results summary */}
      {hasFilter && (
        <div className="px-5 py-1.5 bg-surface-950/60 border-b border-surface-800/60 flex-shrink-0">
          <span className="text-xs text-surface-500">
            <strong className="text-surface-300">{totalVisible}</strong> result{totalVisible !== 1 ? 's' : ''}
            {searchQuery.trim() && (
              <> for <strong className="text-surface-300">"{searchQuery.trim()}"</strong></>
            )}
            {activeExtFilter && (
              <> · <strong className="text-surface-300">.{activeExtFilter}</strong></>
            )}
          </span>
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto" role="rowgroup">
        {groups.map((group) => (
          <div key={group.factoryFolder.folderPath}>
            <FactoryHeader
              folder={group.factoryFolder}
              docCount={group.documents.length}
            />
            {group.documents.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                onSelect={handleSelect}
                onDoubleClick={handleDoubleClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
