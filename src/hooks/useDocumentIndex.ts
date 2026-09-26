/**
 * useDocumentIndex.ts
 *
 * Manages loading/scanning lifecycle and wires up IPC event listeners.
 * Must be mounted once at the top level of the app.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/documentStore';
import type { AppIndex, ScanProgress } from '../../shared/types';

export function useDocumentIndex() {
  const {
    setPhase,
    setAppIndex,
    setScanProgress,
    setRootPath,
    setError,
    setRefreshing,
    addToast,
    rootPath,
    phase
  } = useAppStore();

  const api = window.electronAPI;

  // Keep a ref to avoid stale closures in the IPC callbacks
  const rootPathRef = useRef(rootPath);
  rootPathRef.current = rootPath;

  /**
   * Scan a root path: show progress, load index, start watcher.
   */
  const startScan = useCallback(async (path: string) => {
    setPhase('scanning');
    setRootPath(path);
    try {
      const index: AppIndex = await api.scanFolder(path);
      setAppIndex(index);
      // Start the filesystem watcher after initial scan completes
      api.startWatcher(path);
      await api.saveSettings({ lastRootPath: path });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to scan folder: ${msg}`);
      addToast('error', `Scan failed: ${msg}`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Let user pick a new folder via the native dialog.
   */
  const selectFolder = useCallback(async () => {
    const picked = await api.selectFolder();
    if (!picked) return;
    api.stopWatcher();
    await startScan(picked);
  }, [startScan]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Manual refresh — rescan current root.
   */
  const refresh = useCallback(async () => {
    const currentRoot = rootPathRef.current;
    if (!currentRoot || phase === 'scanning') return;
    setRefreshing(true);
    try {
      const index: AppIndex = await api.scanFolder(currentRoot);
      setAppIndex(index);
      addToast('success', 'Index refreshed successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRefreshing(false);
      setError(msg);
      addToast('error', `Refresh failed: ${msg}`);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wire up IPC event listeners on mount ──────────────────
  useEffect(() => {
    const cleanupIndex = api.onIndexUpdated((index: AppIndex) => {
      setAppIndex(index);
    });

    const cleanupProgress = api.onScanProgress((progress: ScanProgress) => {
      setScanProgress(progress);
    });

    const cleanupError = api.onWatcherError((error: string) => {
      addToast('warning', `File watcher: ${error}`);
    });

    // Restore last session
    const init = async () => {
      try {
        const settings = await api.getSettings();
        if (settings.lastRootPath) {
          setRootPath(settings.lastRootPath);
          await startScan(settings.lastRootPath);
        } else {
          setPhase('welcome');
        }
      } catch (err) {
        console.error('[useDocumentIndex] Failed to load settings:', err);
        setPhase('welcome');
      }
    };

    init();

    return () => {
      cleanupIndex();
      cleanupProgress();
      cleanupError();
      api.stopWatcher();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { selectFolder, refresh };
}
