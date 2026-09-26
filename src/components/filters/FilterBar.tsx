/**
 * FilterBar.tsx
 *
 * Dynamically generated extension filter pills + sort controls + view toggle.
 * Extensions come from the actual discovered files — not hardcoded.
 */

import { SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '../../store/documentStore';
import { groupExtensionLabel } from '../../utils/fileIcons';
import { ViewToggle } from '../ui/ViewToggle';

export function FilterBar() {
  const {
    appIndex,
    activeExtFilter,
    setExtFilter,
    sortOrder,
    setSortOrder,
    viewMode,
  } = useAppStore();

  if (!appIndex) return null;

  const extensions = appIndex.allExtensions;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-900/50 border-b border-surface-700/40
                    flex-shrink-0 overflow-x-auto">
      <SlidersHorizontal className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />

      {/* Extension filters */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => setExtFilter(null)}
          className={`
            px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-100 flex-shrink-0
            ${!activeExtFilter
              ? 'bg-accent-600/25 text-accent-300 border border-accent-600/40'
              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
            }
          `}
        >
          All
        </button>

        {extensions.map((ext) => (
          <button
            key={ext}
            onClick={() => setExtFilter(activeExtFilter === ext ? null : ext)}
            className={`
              px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-100 flex-shrink-0 font-mono
              ${activeExtFilter === ext
                ? 'bg-accent-600/25 text-accent-300 border border-accent-600/40'
                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
              }
            `}
          >
            {groupExtensionLabel(ext)}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Sort control — only shown in grid view; list view has its own column sort */}
      {viewMode === 'grid' && (
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
          className="bg-surface-800 border border-surface-700 text-surface-300 text-xs rounded-lg
                     px-2 py-1 focus:outline-none focus:border-accent-500 flex-shrink-0 cursor-pointer"
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="rev-desc">Highest Rev</option>
          <option value="rev-asc">Lowest Rev</option>
          <option value="modified-desc">Recently Modified</option>
        </select>
      )}

      {/* Divider */}
      <div className="w-px h-4 bg-surface-700 flex-shrink-0" />

      {/* View mode toggle */}
      <ViewToggle />
    </div>
  );
}
