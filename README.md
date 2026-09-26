# Document Revision Index

A polished Windows desktop application for indexing, browsing, and navigating engineering document revisions.

Built with **Electron + React + TypeScript + Vite + Tailwind CSS**.

---

## Features

- **Recursive folder scanning** — discovers all documents regardless of nesting depth
- **Automatic revision detection** — parses `Document Name -N.ext` convention
- **Live filesystem watching** — automatically updates when files are added, removed, or changed
- **Hierarchical navigation** — preserves your folder structure in the sidebar
- **Missing revision detection** — warns when revisions are non-consecutive
- **Multi-extension support** — `Drawing -2.pdf` and `Drawing -2.dwg` grouped together
- **Unversioned file tracking** — files without a revision suffix still appear
- **Global search** — searches across folder names, document names, filenames
- **Dynamic extension filters** — generated from files actually discovered
- **OS file opening** — opens files using the system's default application
- **Persistent settings** — remembers the last selected folder across restarts
- **Manual refresh** — force a rescan at any time

---

## Installation & Development

### Prerequisites

- Node.js v18+ (v22 recommended)
- npm v9+

### Setup

```bash
# Install dependencies
npm install

# Start in development mode (with DevTools)
npm run dev
```

### Run Unit Tests

```bash
npm test
```

### Build for Production (Windows)

```bash
npm run build
```

This produces a distributable in the `release/` directory.

---

## How Revision Detection Works

### Naming Convention

Files must follow this exact pattern:

```
<Document Name> -<Number>.<Extension>
```

**Examples (versioned):**

| Filename | Document Name | Revision | Extension |
|---|---|---|---|
| `Drawing -0.pdf` | Drawing | 0 | pdf |
| `Drawing -12.pdf` | Drawing | 12 | pdf |
| `Drawing -01.pdf` | Drawing | 1 (leading zeros OK) | pdf |
| `Factory Layout -3.dwg` | Factory Layout | 3 | dwg |
| `Blah Bah Blah -2.pdf` | Blah Bah Blah | 2 | pdf |

**Examples (unversioned — no revision detected):**

| Filename | Reason |
|---|---|
| `Drawing.pdf` | No ` -N` suffix |
| `Drawing -2 FINAL.pdf` | Space between number and extension |
| `Drawing -abc.pdf` | Non-numeric revision |
| `README.txt` | No ` -N` suffix |

### Revision Number Rules

- The regex is: `^(.+?) -(\d+)\.(\w+)$`
- Only the **final** `-<integer>` immediately before the extension counts
- Revision numbers are compared **numerically** (not lexicographically), so `10 > 9`
- The **highest revision number** is always the latest — modification date is ignored
- Extensions are **normalised to lowercase** internally

### Missing Revisions

If revisions `[0, 1, 3]` are found, revision `2` is flagged as missing.

Revisions **before** the minimum discovered are not considered missing:
- `[3, 5]` → only revision `4` is missing (not `0`, `1`, `2`)

---

## Folder Structure

The application expects:

```
Root Folder/
├── Factory A/
│   ├── Drawings/
│   │   ├── Pump -0.dwg
│   │   ├── Pump -1.dwg
│   │   └── Pump -2.dwg
│   └── Reports/
│       ├── Report -0.pdf
│       └── Report -1.pdf
│
└── Factory B/
    └── ...
```

- The **root folder** is selected by the user
- **Immediate children** of the root are treated as top-level factory/project folders
- All **subdirectories** are recursively scanned
- The UI preserves the full folder hierarchy

---

## Supported Filesystem Behavior

| Event | Behavior |
|---|---|
| File added | Detected automatically, index updated |
| File deleted | Detected automatically, revision removed |
| File modified | Detected automatically, date updated |
| Folder added | Detected automatically, new folder appears |
| Folder deleted | Detected automatically, folder removed |
| Rename | Treated as delete + add |
| Network drives (`\\server\share\...`) | Supported; watcher may be less reliable |

Filesystem events are **debounced** (400ms window) to handle rapid multi-file operations.

---

## Architecture

```
electron/
├── main.ts              ← Electron entry, window, IPC registration
├── preload.ts           ← Context bridge API
├── core/
│   ├── parser.ts        ← Filename/revision regex parser
│   ├── grouper.ts       ← Document grouping + missing revision logic
│   ├── scanner.ts       ← Recursive FS scanner → AppIndex
│   └── watcher.ts       ← chokidar wrapper with debounce
└── utils/
    └── settings.ts      ← electron-store settings persistence

shared/
└── types.ts             ← Shared TypeScript interfaces (IPC-safe)

src/
├── App.tsx              ← Root component / phase routing
├── store/
│   └── documentStore.ts ← Zustand store (index + UI state)
├── hooks/
│   ├── useDocumentIndex.ts ← Scan lifecycle + IPC wiring
│   └── useSearch.ts     ← Search + filter logic
└── components/
    ├── layout/          ← Header, Sidebar
    ├── documents/       ← DocumentCard, DocumentGrid, DocumentDetail
    ├── filters/         ← FilterBar
    └── ui/              ← WelcomeScreen, ScanningScreen, ToastContainer
```

---

## Packaging for Windows

```bash
# Build the distributable installer
npm run build

# Output: release/Document Revision Index Setup x.x.x.exe
```

The installer is generated by **electron-builder** targeting NSIS.

---

## Important: Read-Only Application

This application **only reads, indexes, watches, and opens** your files.

It **never**:
- Renames files
- Moves files
- Deletes files
- Modifies files
- Creates files in your document directories

Your files are always safe.
