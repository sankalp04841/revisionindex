/**
 * ViewToggle.tsx
 *
 * Grid / List view toggle button pair.
 * Sits inside the FilterBar next to the sort controls.
 */

import { LayoutGrid, List } from 'lucide-react';
import { useAppStore } from '../../store/documentStore';
import type { ViewMode } from '../../store/documentStore';

export function ViewToggle() {
  const { viewMode, setViewMode } = useAppStore();

  const options: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    {
      mode: 'grid',
      icon: <LayoutGrid className="w-3.5 h-3.5" />,
      label: 'Grid view',
    },
    {
      mode: 'list',
      icon: <List className="w-3.5 h-3.5" />,
      label: 'List view',
    },
  ];

  return (
    <div
      className="flex items-center bg-surface-800 border border-surface-700 rounded-lg p-0.5 flex-shrink-0"
      role="group"
      aria-label="View mode"
    >
      {options.map(({ mode, icon, label }) => (
        <button
          key={mode}
          id={`view-toggle-${mode}`}
          onClick={() => setViewMode(mode)}
          title={label}
          aria-label={label}
          aria-pressed={viewMode === mode}
          className={`
            flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150
            ${viewMode === mode
              ? 'bg-accent-600/30 text-accent-300 shadow-sm'
              : 'text-surface-500 hover:text-surface-300 hover:bg-surface-700/50'
            }
          `}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
