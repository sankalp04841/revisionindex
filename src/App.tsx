/**
 * App.tsx
 *
 * Root component. Renders the appropriate screen based on application phase.
 * Wires together the document index hook, layout, and all sub-components.
 */

import { useAppStore } from './store/documentStore';
import { useDocumentIndex } from './hooks/useDocumentIndex';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DocumentGrid } from './components/documents/DocumentGrid';
import { ListView } from './components/documents/ListView';
import { DocumentDetail } from './components/documents/DocumentDetail';
import { FilterBar } from './components/filters/FilterBar';
import { WelcomeScreen } from './components/ui/WelcomeScreen';
import { ScanningScreen } from './components/ui/ScanningScreen';
import { ToastContainer } from './components/ui/ToastContainer';

export default function App() {
  const { phase, viewMode } = useAppStore();
  const { selectFolder, refresh } = useDocumentIndex();

  return (
    <div className="flex flex-col h-screen bg-surface-950 text-surface-100 overflow-hidden">
      {/* Header — always visible */}
      <Header onSelectFolder={selectFolder} onRefresh={refresh} />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {phase === 'welcome' && (
          <WelcomeScreen onSelectFolder={selectFolder} />
        )}

        {phase === 'scanning' && (
          <ScanningScreen />
        )}

        {phase === 'error' && (
          <ErrorScreen onSelectFolder={selectFolder} />
        )}

        {phase === 'ready' && (
          <>
            {/* Sidebar: shown in grid view only — list view is full-width */}
            {viewMode === 'grid' && <Sidebar />}

            <main className="flex flex-col flex-1 overflow-hidden">
              <FilterBar />
              {viewMode === 'grid' ? <DocumentGrid /> : <ListView />}
            </main>
          </>
        )}
      </div>

      {/* Document detail drawer (portal-like, overlays everything) */}
      <DocumentDetail />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Error screen
// ─────────────────────────────────────────────────────────────

function ErrorScreen({ onSelectFolder }: { onSelectFolder: () => void }) {
  const { errorMessage } = useAppStore();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-surface-100 select-none px-6">
      <div className="w-14 h-14 rounded-2xl bg-red-900/20 border border-red-800/40 flex items-center justify-center mb-5">
        <span className="text-2xl">⚠</span>
      </div>
      <h2 className="text-xl font-semibold text-surface-100 mb-2">Something went wrong</h2>
      {errorMessage && (
        <p className="text-sm text-surface-400 text-center max-w-md mb-6 font-mono bg-surface-800
                      border border-surface-700 rounded-lg px-4 py-3">
          {errorMessage}
        </p>
      )}
      <button onClick={onSelectFolder} className="btn-primary">
        Select a Different Folder
      </button>
    </div>
  );
}
