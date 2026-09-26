/**
 * DocumentCard.tsx
 *
 * Card displaying a single grouped document with:
 * - Document name
 * - Extension badges
 * - Latest revision badge
 * - Revision chain (0 → 1 → 2 → 3)
 * - Missing revision warning
 * - Modified date
 * - Open button
 */

import { FileText, ExternalLink, ChevronRight, AlertTriangle, History } from 'lucide-react';
import { useAppStore } from '../../store/documentStore';
import { getFileTypeInfo } from '../../utils/fileIcons';
import { formatDate } from '../../utils/formatters';
import type { Document } from '../../../shared/types';

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document: doc }: DocumentCardProps) {
  const { selectDocument, addToast } = useAppStore();

  const latestRevision = doc.latestRevisionNumber !== null
    ? doc.revisions.find((r) => r.revisionNumber === doc.latestRevisionNumber)
    : null;

  const latestFile = latestRevision?.files[0];

  // Get the most recently modified file across all revisions for display
  const mostRecentDate = doc.revisions
    .flatMap((r) => r.files)
    .reduce<string | null>((latest, f) => {
      if (!latest) return f.modifiedAt;
      return f.modifiedAt > latest ? f.modifiedAt : latest;
    }, null);

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!latestFile) return;
    try {
      const result = await window.electronAPI.openFile(latestFile.filePath);
      if (!result.success) {
        addToast('error', result.error ?? 'Failed to open file');
      }
    } catch {
      addToast('error', 'Failed to open file');
    }
  };

  const revNums = doc.revisions.map((r) => r.revisionNumber);

  return (
    <div
      className="card p-4 cursor-pointer group animate-fade-in"
      onClick={() => selectDocument(doc)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && selectDocument(doc)}
    >
      {/* Top row: icon + ext badges + latest badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-surface-700/60 border border-surface-600/50
                          flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-surface-400" />
          </div>
          <div className="flex flex-wrap gap-1">
            {doc.extensions.slice(0, 4).map((ext) => {
              const info = getFileTypeInfo(ext);
              return (
                <span
                  key={ext}
                  className={`badge text-[10px] ${info.bgClass} ${info.colorClass} border-transparent`}
                >
                  {info.label}
                </span>
              );
            })}
          </div>
        </div>

        {doc.latestRevisionNumber !== null && (
          <span className="badge-blue text-[10px] flex-shrink-0">
            REV {doc.latestRevisionNumber}
          </span>
        )}
      </div>

      {/* Document name */}
      <h3 className="font-semibold text-surface-100 text-sm leading-tight mb-1 truncate">
        {doc.name}
      </h3>

      {/* Latest filename */}
      {latestFile && (
        <p className="text-xs text-surface-500 font-mono truncate mb-2.5">
          {latestFile.fileName}
        </p>
      )}

      {/* Revision chain */}
      {revNums.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2.5">
          {revNums.map((n, i) => (
            <span key={n} className="flex items-center gap-1">
              <span className={`
                text-xs px-1.5 py-0.5 rounded font-mono font-medium
                ${n === doc.latestRevisionNumber
                  ? 'bg-accent-600/25 text-accent-300'
                  : 'bg-surface-700/60 text-surface-400'}
              `}>
                {n}
              </span>
              {i < revNums.length - 1 && (
                <ChevronRight className="w-2.5 h-2.5 text-surface-600 flex-shrink-0" />
              )}
            </span>
          ))}
        </div>
      )}

      {/* Missing revisions warning */}
      {doc.missingRevisions.length > 0 && (
        <div className="flex items-center gap-1.5 text-amber-400 text-xs mb-2.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>Missing rev{doc.missingRevisions.length > 1 ? 's' : ''}: {doc.missingRevisions.join(', ')}</span>
        </div>
      )}

      {/* Date + sub-folder path */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="text-xs text-surface-600 truncate">
          {mostRecentDate && formatDate(mostRecentDate)}
          {doc.directoryRelativePath && doc.directoryRelativePath !== '.' && (
            <span className="ml-1 text-surface-700 font-mono">
              • {doc.directoryRelativePath}
            </span>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-700/50">
        {latestFile && (
          <button
            id={`open-doc-${doc.id}`}
            onClick={handleOpen}
            className="btn-primary text-xs h-7 px-3 flex-shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); selectDocument(doc); }}
          className="btn-ghost text-xs h-7 px-2 flex-shrink-0"
        >
          <History className="w-3 h-3" />
          History
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-surface-600 ml-auto
                                 group-hover:text-surface-400 transition-colors" />
      </div>
    </div>
  );
}
