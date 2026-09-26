/**
 * ScanningScreen.tsx
 *
 * Shown while the initial scan or refresh is in progress.
 */

import { Loader2, FolderOpen, FileText } from 'lucide-react';
import { useAppStore } from '../../store/documentStore';

export function ScanningScreen() {
  const { scanProgress, rootPath } = useAppStore();

  return (
    <div className="flex flex-col items-center justify-center h-full bg-surface-950 text-surface-100 select-none">
      <div className="w-16 h-16 rounded-2xl bg-accent-600/20 border border-accent-600/30 flex items-center justify-center mb-6">
        <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
      </div>

      <h2 className="text-xl font-semibold text-surface-100 mb-1">
        {scanProgress?.phase === 'parsing'
          ? 'Parsing filenames…'
          : scanProgress?.phase === 'grouping'
          ? 'Grouping documents…'
          : 'Scanning folder…'}
      </h2>

      {rootPath && (
        <p className="text-surface-500 text-sm font-mono mb-6 max-w-md truncate text-center">
          {rootPath}
        </p>
      )}

      {scanProgress && (
        <div className="flex gap-6 mt-2">
          {scanProgress.totalFolders > 0 && (
            <div className="flex items-center gap-2 text-surface-400 text-sm">
              <FolderOpen className="w-4 h-4 text-accent-500" />
              <span>
                <span className="font-semibold text-surface-200">{scanProgress.totalFolders}</span> folders
              </span>
            </div>
          )}
          {scanProgress.totalFiles > 0 && (
            <div className="flex items-center gap-2 text-surface-400 text-sm">
              <FileText className="w-4 h-4 text-accent-500" />
              <span>
                <span className="font-semibold text-surface-200">{scanProgress.totalFiles}</span> files
              </span>
            </div>
          )}
        </div>
      )}

      {scanProgress?.message && (
        <p className="mt-6 text-surface-500 text-xs">{scanProgress.message}</p>
      )}
    </div>
  );
}
