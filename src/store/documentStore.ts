/**
 * documentStore.ts
 *
 * Central Zustand store for the application.
 * Separates filesystem/index state from UI state.
 */

import { create } from 'zustand';
import type { AppIndex, FolderIndex, Document, ScanProgress } from '../../shared/types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AppPhase =
  | 'welcome'       // No root folder selected
  | 'scanning'      // Initial scan in progress
  | 'ready'         // Index loaded and ready
  | 'error';        // Unrecoverable error

export type ViewMode = 'grid' | 'list';

export type SortField = 'name-asc' | 'name-desc' | 'rev-asc' | 'rev-desc' | 'modified-desc' | 'factory-asc';

interface UIState {
  // Sidebar
  selectedFolderPath: string | null;
  expandedFolderPaths: Set<string>;

  // Detail drawer
  selectedDocument: Document | null;

  // Search / filter
  searchQuery: string;
  activeExtFilter: string | null; // null = all

  // Sort (grid view)
  sortOrder: 'name-asc' | 'name-desc' | 'rev-asc' | 'rev-desc' | 'modified-desc';

  // View mode toggle
  viewMode: ViewMode;

  // List view sort
  listSortOrder: SortField;

  // Toast notifications
  toasts: Toast[];
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  expiresAt: number;
}

interface IndexState {
  phase: AppPhase;
  appIndex: AppIndex | null;
  scanProgress: ScanProgress | null;
  errorMessage: string | null;
  isRefreshing: boolean;
  rootPath: string | null;
}

interface AppStore extends IndexState, UIState {
  // ── Index actions ──────────────────────────────────────────
  setPhase: (phase: AppPhase) => void;
  setAppIndex: (index: AppIndex) => void;
  setScanProgress: (progress: ScanProgress) => void;
  setRootPath: (path: string | null) => void;
  setError: (msg: string | null) => void;
  setRefreshing: (r: boolean) => void;

  // ── UI actions ─────────────────────────────────────────────
  selectFolder: (folderPath: string | null) => void;
  toggleFolderExpanded: (folderPath: string) => void;
  setFolderExpanded: (folderPath: string, expanded: boolean) => void;
  selectDocument: (doc: Document | null) => void;
  setSearchQuery: (q: string) => void;
  setExtFilter: (ext: string | null) => void;
  setSortOrder: (order: AppStore['sortOrder']) => void;
  setViewMode: (mode: ViewMode) => void;
  setListSortOrder: (order: SortField) => void;

  // ── Toast actions ──────────────────────────────────────────
  addToast: (type: Toast['type'], message: string, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  // Index state
  phase: 'welcome',
  appIndex: null,
  scanProgress: null,
  errorMessage: null,
  isRefreshing: false,
  rootPath: null,

  // UI state
  selectedFolderPath: null,
  expandedFolderPaths: new Set(),
  selectedDocument: null,
  searchQuery: '',
  activeExtFilter: null,
  sortOrder: 'name-asc',
  viewMode: 'grid',
  listSortOrder: 'name-asc',
  toasts: [],

  // ── Index actions ──────────────────────────────────────────

  setPhase: (phase) => set({ phase }),

  setAppIndex: (index) =>
    set({
      appIndex: index,
      phase: 'ready',
      scanProgress: null,
      errorMessage: null,
      isRefreshing: false
    }),

  setScanProgress: (progress) => set({ scanProgress: progress }),

  setRootPath: (path) => set({ rootPath: path }),

  setError: (msg) =>
    set({ errorMessage: msg, phase: msg ? 'error' : 'ready', isRefreshing: false }),

  setRefreshing: (r) => set({ isRefreshing: r }),

  // ── UI actions ─────────────────────────────────────────────

  selectFolder: (folderPath) =>
    set({
      selectedFolderPath: folderPath,
      selectedDocument: null,
      searchQuery: ''
    }),

  toggleFolderExpanded: (folderPath) => {
    const next = new Set(get().expandedFolderPaths);
    if (next.has(folderPath)) {
      next.delete(folderPath);
    } else {
      next.add(folderPath);
    }
    set({ expandedFolderPaths: next });
  },

  setFolderExpanded: (folderPath, expanded) => {
    const next = new Set(get().expandedFolderPaths);
    if (expanded) {
      next.add(folderPath);
    } else {
      next.delete(folderPath);
    }
    set({ expandedFolderPaths: next });
  },

  selectDocument: (doc) => set({ selectedDocument: doc }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  setExtFilter: (ext) => set({ activeExtFilter: ext }),

  setSortOrder: (order) => set({ sortOrder: order }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setListSortOrder: (order) => set({ listSortOrder: order }),

  // ── Toast actions ──────────────────────────────────────────

  addToast: (type, message, durationMs = 4000) => {
    const id = Math.random().toString(36).slice(2);
    const expiresAt = Date.now() + durationMs;
    set((s) => ({ toasts: [...s.toasts, { id, type, message, expiresAt }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, durationMs + 100);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}));

// ─────────────────────────────────────────────────────────────
// Selectors (exported for convenience)
// ─────────────────────────────────────────────────────────────

/**
 * Recursively find a folder by path within the index tree.
 */
export function findFolderByPath(
  folders: FolderIndex[],
  path: string
): FolderIndex | null {
  for (const f of folders) {
    if (f.folderPath === path) return f;
    const found = findFolderByPath(f.children, path);
    if (found) return found;
  }
  return null;
}

/**
 * Collect all documents from a folder and its descendants.
 */
export function collectAllDocuments(folder: FolderIndex): Document[] {
  const docs: Document[] = [...folder.documents];
  for (const child of folder.children) {
    docs.push(...collectAllDocuments(child));
  }
  return docs;
}
