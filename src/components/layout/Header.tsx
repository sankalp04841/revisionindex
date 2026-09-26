/**
 * Header.tsx
 *
 * Top navigation bar with:
 * - App title
 * - Search bar
 * - Refresh button
 * - Select folder button
 * - Root path display
 */

import { Search, FolderOpen, RotateCw, FileText, X } from 'lucide-react';
import { useAppStore } from '../../store/documentStore';

interface HeaderProps {
  onSelectFolder: () => void;
  onRefresh: () => void;
}

export function Header({ onSelectFolder, onRefresh }: HeaderProps) {
  const { rootPath, phase, isRefreshing, searchQuery, setSearchQuery } = useAppStore();

  const isReady = phase === 'ready';
  const isScanning = phase === 'scanning' || isRefreshing;

  return (
    <header className="flex-shrink-0 h-14 bg-surface-900 border-b border-surface-700/60
                       flex items-center gap-3 px-4 z-30">

      {/* Logo + Title */}
      <div className="flex items-center gap-2.5 flex-shrink-0 mr-2">
        <div className="w-7 h-7 rounded-lg bg-accent-600/25 border border-accent-600/30
                        flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-accent-400" />
        </div>
        <span className="text-sm font-semibold text-surface-100 tracking-tight hidden sm:block">
          Document Revision Index
        </span>
      </div>

      {/* Search */}
      {isReady && (
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          <input
            id="search-input"
            type="text"
            placeholder="Search documents, folders, files…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-9 pr-8 h-8 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500
                         hover:text-surface-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Root path display */}
      {rootPath && (
        <div className="hidden md:flex items-center gap-1.5 text-surface-500 text-xs max-w-xs overflow-hidden">
          <FolderOpen className="w-3 h-3 flex-shrink-0" />
          <span className="truncate font-mono" title={rootPath}>{rootPath}</span>
        </div>
      )}

      {/* Refresh button */}
      {isReady && (
        <button
          id="refresh-btn"
          onClick={onRefresh}
          disabled={isScanning}
          title="Refresh index"
          className="btn-ghost h-8 w-8 p-0 justify-center rounded-lg"
        >
          <RotateCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-accent-400' : ''}`} />
        </button>
      )}

      {/* Select folder */}
      <button
        id="select-folder-btn"
        onClick={onSelectFolder}
        className="btn-secondary h-8 text-xs px-3 flex-shrink-0"
      >
        <FolderOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {rootPath ? 'Change Folder' : 'Select Folder'}
        </span>
      </button>
    </header>
  );
}
