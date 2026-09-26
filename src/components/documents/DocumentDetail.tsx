/**
 * DocumentDetail.tsx
 *
 * Right-side drawer showing full document detail:
 * - Current revision + open button(s)
 * - Full revision history with individual open buttons
 * - Missing revision gaps shown inline
 */

import {
  X, ExternalLink, Circle, CheckCircle2, AlertTriangle,
  Calendar, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store/documentStore';
import { getFileTypeInfo } from '../../utils/fileIcons';
import { formatDate, formatBytes } from '../../utils/formatters';
import type { Document, Revision, FileEntry } from '../../../shared/types';

// ─────────────────────────────────────────────────────────────
// FileOpenRow — a single file row with Open button
// ─────────────────────────────────────────────────────────────

function FileOpenRow({
  file,
  compact = false
}: {
  file: FileEntry;
  compact?: boolean;
}) {
  const { addToast } = useAppStore();
  const info = getFileTypeInfo(file.extension);

  const handleOpen = async () => {
    try {
      const result = await window.electronAPI.openFile(file.filePath);
      if (!result.success) {
        addToast('error', result.error ?? 'Failed to open file');
      }
    } catch {
      addToast('error', 'Failed to open file');
    }
  };

  return (
    <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-1.5'}`}>
      <span
        className={`badge text-[10px] ${info.bgClass} ${info.colorClass} border-transparent flex-shrink-0`}
      >
        {info.label}
      </span>
      <span
        className="text-xs font-mono text-surface-300 flex-1 truncate min-w-0"
        title={file.filePath}
      >
        {file.fileName}
      </span>
      {!compact && (
        <span className="text-xs text-surface-600 flex-shrink-0 hidden sm:inline">
          {formatBytes(file.size)}
        </span>
      )}
      <button
        onClick={handleOpen}
        className="btn-secondary text-[11px] h-6 px-2 flex-shrink-0 gap-1"
        title={`Open ${file.fileName}`}
      >
        <ExternalLink className="w-3 h-3" />
        Open
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RevisionRow — one revision entry in the history list
// ─────────────────────────────────────────────────────────────

interface RevisionRowProps {
  revision: Revision;
  isLatest: boolean;
}

function RevisionRow({ revision, isLatest }: RevisionRowProps) {
  // Pick the most recently modified file for the date display
  const newestFile = [...revision.files].sort(
    (a, b) => (b.modifiedAt > a.modifiedAt ? 1 : -1)
  )[0];

  return (
    <div className={`flex gap-3 py-3 ${isLatest ? '' : 'opacity-90'}`}>
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
        {isLatest ? (
          <CheckCircle2 className="w-4 h-4 text-accent-400" />
        ) : (
          <Circle className="w-4 h-4 text-surface-600" />
        )}
        <div className="flex-1 w-px bg-surface-700/50 mt-1 min-h-[8px]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Rev header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-xs font-bold font-mono ${isLatest ? 'text-accent-300' : 'text-surface-300'}`}>
            REV {revision.revisionNumber}
          </span>
          {isLatest && (
            <span className="badge-green text-[10px]">CURRENT</span>
          )}
          <div className="ml-auto flex items-center gap-1 text-xs text-surface-600">
            <Calendar className="w-3 h-3" />
            {formatDate(newestFile.modifiedAt)}
          </div>
        </div>

        {/* Files */}
        <div className="space-y-0.5">
          {revision.files.map((file) => (
            <FileOpenRow key={file.filePath} file={file} compact={revision.files.length > 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MissingRevisionGap — amber warning between two revisions
// ─────────────────────────────────────────────────────────────

function MissingRevisionGap({ missing }: { missing: number[] }) {
  return (
    <div className="flex gap-3 py-1">
      <div className="flex flex-col items-center flex-shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-500/70" />
        <div className="flex-1 w-px bg-surface-700/50 mt-1 min-h-[4px]" />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <span className="text-xs text-amber-500/80">
          Missing rev{missing.length > 1 ? 's' : ''}: {missing.join(', ')}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DocumentDetail — main drawer
// ─────────────────────────────────────────────────────────────

export function DocumentDetail() {
  const { selectedDocument, selectDocument } = useAppStore();

  if (!selectedDocument) return null;

  const doc: Document = selectedDocument;
  const latestRevNum = doc.latestRevisionNumber;

  // History: descending order (newest first)
  const sortedRevisions = [...doc.revisions].sort(
    (a, b) => b.revisionNumber - a.revisionNumber
  );
  const latestRev = sortedRevisions[0] ?? null;

  // For each consecutive pair (in descending order), find missing revisions between them
  function getMissingBetween(higher: number, lower: number): number[] {
    const out: number[] = [];
    for (let n = lower + 1; n < higher; n++) {
      if (doc.missingRevisions.includes(n)) out.push(n);
    }
    return out.reverse(); // Show in descending order
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-overlay animate-fade-in"
        onClick={() => selectDocument(null)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="drawer-panel animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label={`Document detail: ${doc.name}`}
      >
        {/* ── Sticky header ─── */}
        <div className="sticky top-0 bg-surface-850 border-b border-surface-700/60
                        px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-surface-50 leading-tight">{doc.name}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <ChevronRight className="w-3 h-3 text-surface-600" />
              <p className="text-xs text-surface-500 font-mono truncate" title={doc.directoryRelativePath}>
                {doc.directoryRelativePath || doc.directoryName}
              </p>
            </div>
          </div>
          <button
            id={`close-detail-${doc.id}`}
            onClick={() => selectDocument(null)}
            className="btn-ghost w-8 h-8 p-0 justify-center rounded-lg flex-shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Content ─── */}
        <div className="px-5 py-5 space-y-7">

          {/* Current revision hero */}
          {latestRev && (
            <section>
              <p className="section-label mb-3">Current Revision</p>
              <div className="bg-accent-600/10 border border-accent-600/25 rounded-xl p-4">
                <div className="flex items-baseline justify-between gap-2 mb-3">
                  <span className="text-3xl font-bold text-accent-300 font-mono leading-none">
                    REV {latestRevNum}
                  </span>
                  <span className="badge-green flex-shrink-0">LATEST</span>
                </div>

                <div className="space-y-1">
                  {latestRev.files.map((file) => (
                    <FileOpenRow key={file.filePath} file={file} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Extension summary */}
          {doc.extensions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {doc.extensions.map((ext) => {
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
              <span className="badge-surface text-[10px]">
                {doc.revisions.reduce((s, r) => s + r.files.length, 0)} file{doc.revisions.reduce((s, r) => s + r.files.length, 0) !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Missing revisions alert */}
          {doc.missingRevisions.length > 0 && (
            <div className="flex items-center gap-2 text-amber-400 text-xs
                            bg-amber-900/15 border border-amber-900/30 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Missing revision{doc.missingRevisions.length > 1 ? 's' : ''}: {' '}
                <strong>{doc.missingRevisions.join(', ')}</strong>
              </span>
            </div>
          )}

          {/* Full revision history */}
          {sortedRevisions.length > 0 && (
            <section>
              <p className="section-label mb-1">
                Revision History
                <span className="ml-2 normal-case font-normal tracking-normal text-surface-600">
                  · {sortedRevisions.length} revision{sortedRevisions.length !== 1 ? 's' : ''}
                </span>
              </p>

              <div className="divide-y divide-surface-700/0">
                {sortedRevisions.map((rev, i) => {
                  const nextRev = sortedRevisions[i + 1]; // lower revision number
                  const missingBefore = nextRev
                    ? getMissingBetween(rev.revisionNumber, nextRev.revisionNumber)
                    : [];

                  return (
                    <div key={rev.revisionNumber}>
                      <RevisionRow
                        revision={rev}
                        isLatest={rev.revisionNumber === latestRevNum}
                      />
                      {missingBefore.length > 0 && (
                        <MissingRevisionGap missing={missingBefore} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* No revisions (shouldn't normally reach here, but guard) */}
          {sortedRevisions.length === 0 && (
            <div className="text-center py-6 text-surface-600 text-sm">
              No revisions found.
            </div>
          )}

        </div>
      </div>
    </>
  );
}
