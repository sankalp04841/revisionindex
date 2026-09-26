/**
 * Sidebar.tsx
 *
 * Left sidebar showing hierarchical folder tree.
 * Clicking a folder filters the main content to show only its documents.
 */

import { FolderOpen, Folder, ChevronRight, ChevronDown, Files } from 'lucide-react';
import { useAppStore, findFolderByPath } from '../../store/documentStore';
import type { FolderIndex } from '../../../shared/types';

interface FolderNodeProps {
  folder: FolderIndex;
  depth?: number;
}

function FolderNode({ folder, depth = 0 }: FolderNodeProps) {
  const {
    selectedFolderPath,
    expandedFolderPaths,
    selectFolder,
    toggleFolderExpanded
  } = useAppStore();

  const isSelected = selectedFolderPath === folder.folderPath;
  const isExpanded = expandedFolderPaths.has(folder.folderPath);
  const hasChildren = folder.children.length > 0;

  const handleClick = () => {
    selectFolder(isSelected ? null : folder.folderPath);
    if (hasChildren && !isExpanded) {
      toggleFolderExpanded(folder.folderPath);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolderExpanded(folder.folderPath);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left
          transition-colors duration-100 group
          ${isSelected
            ? 'bg-accent-600/20 text-accent-300 border border-accent-600/30'
            : 'text-surface-300 hover:bg-surface-700/50 hover:text-surface-100 border border-transparent'
          }
        `}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        title={folder.folderPath}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <span
            onClick={handleToggle}
            className="flex-shrink-0 text-surface-500 hover:text-surface-300 transition-colors"
          >
            {isExpanded
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
            }
          </span>
        ) : (
          <span className="w-3.5 h-3.5 flex-shrink-0" />
        )}

        {/* Folder icon */}
        {isSelected || isExpanded
          ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-accent-400" />
          : <Folder className="w-3.5 h-3.5 flex-shrink-0 text-surface-500 group-hover:text-surface-300" />
        }

        {/* Name */}
        <span className="flex-1 text-xs font-medium truncate">{folder.folderName}</span>

        {/* Doc count */}
        {folder.totalDocuments > 0 && (
          <span className={`
            text-xs flex-shrink-0 tabular-nums
            ${isSelected ? 'text-accent-400' : 'text-surface-600'}
          `}>
            {folder.totalDocuments}
          </span>
        )}
      </button>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderNode key={child.folderPath} folder={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { appIndex, selectedFolderPath, selectFolder } = useAppStore();

  if (!appIndex) return null;

  const totalDocs = appIndex.totalDocuments;

  return (
    <aside className="w-56 flex-shrink-0 bg-surface-900 border-r border-surface-700/60
                      flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <p className="section-label mb-2">Folders</p>
        {/* All folders option */}
        <button
          onClick={() => selectFolder(null)}
          className={`
            w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left
            transition-colors duration-100 mb-1
            ${!selectedFolderPath
              ? 'bg-accent-600/20 text-accent-300 border border-accent-600/30'
              : 'text-surface-400 hover:bg-surface-700/50 hover:text-surface-100 border border-transparent'
            }
          `}
        >
          <Files className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs font-medium flex-1">All Folders</span>
          <span className={`text-xs tabular-nums ${!selectedFolderPath ? 'text-accent-400' : 'text-surface-600'}`}>
            {totalDocs}
          </span>
        </button>
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {appIndex.folders.length === 0 ? (
          <p className="text-xs text-surface-600 px-3 py-4 text-center">
            No folders found
          </p>
        ) : (
          <div className="space-y-0.5">
            {appIndex.folders.map((folder) => (
              <FolderNode key={folder.folderPath} folder={folder} />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex-shrink-0 border-t border-surface-700/60 px-4 py-3">
        <div className="text-xs text-surface-600 space-y-0.5">
          <div className="flex justify-between">
            <span>Folders</span>
            <span className="text-surface-500">{appIndex.totalFolders}</span>
          </div>
          <div className="flex justify-between">
            <span>Documents</span>
            <span className="text-surface-500">{appIndex.totalDocuments}</span>
          </div>
          <div className="flex justify-between">
            <span>Files</span>
            <span className="text-surface-500">{appIndex.totalFiles}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
