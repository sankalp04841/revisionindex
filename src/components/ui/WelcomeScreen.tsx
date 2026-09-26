/**
 * WelcomeScreen.tsx
 *
 * Shown on first launch before any root folder is selected.
 */

import { FolderOpen, FileText, RotateCw, Eye } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectFolder: () => void;
}

export function WelcomeScreen({ onSelectFolder }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-surface-950 text-surface-100 select-none">
      {/* Logo / Icon cluster */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-accent-600/20 border border-accent-600/30 flex items-center justify-center">
          <FileText className="w-10 h-10 text-accent-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-surface-800 border border-surface-600 flex items-center justify-center">
          <RotateCw className="w-4 h-4 text-accent-400" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight text-surface-50 mb-2">
        Document Revision Index
      </h1>
      <p className="text-surface-400 text-base text-center max-w-sm mb-10 leading-relaxed">
        Select the folder containing your document folders to begin indexing revisions.
      </p>

      {/* CTA */}
      <button
        id="welcome-select-folder-btn"
        onClick={onSelectFolder}
        className="btn-primary text-base px-6 py-3 rounded-xl gap-3"
      >
        <FolderOpen className="w-5 h-5" />
        Select Root Folder
      </button>

      {/* Feature pills */}
      <div className="mt-12 flex flex-wrap gap-3 justify-center max-w-lg">
        {[
          { icon: <Eye className="w-3.5 h-3.5" />, text: 'Live filesystem watching' },
          { icon: <RotateCw className="w-3.5 h-3.5" />, text: 'Automatic revision detection' },
          { icon: <FileText className="w-3.5 h-3.5" />, text: 'Any file extension' },
          { icon: <FolderOpen className="w-3.5 h-3.5" />, text: 'Nested folder support' }
        ].map(({ icon, text }) => (
          <span
            key={text}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-surface-800 border border-surface-700 text-surface-400 text-xs"
          >
            {icon}
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
