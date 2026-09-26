/**
 * grouper.test.ts
 *
 * Unit tests for document grouping, missing revision detection, and sorting.
 */

import { describe, it, expect } from 'vitest';
import { groupFilesIntoDocuments, computeMissingRevisions, makeDocumentId } from '../electron/core/grouper';
import type { FileEntry } from '../shared/types';

function makeFile(fileName: string, dirPath = 'C:\\docs'): FileEntry {
  return {
    filePath: `${dirPath}\\${fileName}`,
    fileName,
    extension: fileName.split('.').pop()?.toLowerCase() ?? '',
    modifiedAt: '2026-09-01T00:00:00.000Z',
    size: 1024,
    directoryPath: dirPath,
    relativePath: fileName
  };
}

// ─────────────────────────────────────────────────────────────
// computeMissingRevisions
// ─────────────────────────────────────────────────────────────

describe('computeMissingRevisions', () => {
  it('returns empty for consecutive revisions', () => {
    expect(computeMissingRevisions([0, 1, 2, 3])).toEqual([]);
  });

  it('detects a single missing revision', () => {
    expect(computeMissingRevisions([0, 1, 3])).toEqual([2]);
  });

  it('detects multiple missing revisions', () => {
    expect(computeMissingRevisions([0, 1, 3, 5])).toEqual([2, 4]);
  });

  it('does NOT count revisions before the minimum as missing', () => {
    // revisions [3, 5] → only 4 is missing, not 0,1,2
    expect(computeMissingRevisions([3, 5])).toEqual([4]);
  });

  it('returns empty for a single revision', () => {
    expect(computeMissingRevisions([7])).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(computeMissingRevisions([])).toEqual([]);
  });

  it('handles non-sequential large revisions', () => {
    expect(computeMissingRevisions([10, 12])).toEqual([11]);
  });
});

// ─────────────────────────────────────────────────────────────
// groupFilesIntoDocuments
// ─────────────────────────────────────────────────────────────

describe('groupFilesIntoDocuments — basic grouping', () => {
  it('groups multiple revisions of the same document', () => {
    const files = [
      makeFile('Drawing -0.pdf'),
      makeFile('Drawing -1.pdf'),
      makeFile('Drawing -2.pdf')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    expect(documents).toHaveLength(1);
    expect(documents[0].name).toBe('Drawing');
    expect(documents[0].revisions).toHaveLength(3);
    expect(documents[0].latestRevisionNumber).toBe(2);
  });

  it('finds the correct latest revision', () => {
    // Latest is 5, not 3
    const files = [
      makeFile('Drawing -0.pdf'),
      makeFile('Drawing -3.pdf'),
      makeFile('Drawing -5.pdf')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    expect(documents[0].latestRevisionNumber).toBe(5);
  });

  it('sorts revisions numerically, not lexicographically', () => {
    const files = [
      makeFile('Drawing -10.pdf'),
      makeFile('Drawing -2.pdf'),
      makeFile('Drawing -1.pdf')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    const revNums = documents[0].revisions.map((r) => r.revisionNumber);
    expect(revNums).toEqual([1, 2, 10]); // ascending numeric order
    expect(documents[0].latestRevisionNumber).toBe(10);
  });
});

describe('groupFilesIntoDocuments — multiple extensions', () => {
  it('groups different extensions at the same revision together', () => {
    const files = [
      makeFile('Pump -2.pdf'),
      makeFile('Pump -2.dwg'),
      makeFile('Pump -2.png')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    expect(documents).toHaveLength(1);
    expect(documents[0].revisions).toHaveLength(1);
    expect(documents[0].revisions[0].files).toHaveLength(3);
  });

  it('collects all distinct extensions for the document', () => {
    const files = [
      makeFile('Pump -1.pdf'),
      makeFile('Pump -1.dwg'),
      makeFile('Pump -2.pdf')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    expect(documents[0].extensions.sort()).toEqual(['dwg', 'pdf']);
  });
});

describe('groupFilesIntoDocuments — missing revisions', () => {
  it('detects missing revisions correctly', () => {
    const files = [
      makeFile('Drawing -0.pdf'),
      makeFile('Drawing -1.pdf'),
      makeFile('Drawing -3.pdf')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    expect(documents[0].missingRevisions).toEqual([2]);
  });

  it('does NOT count revisions below the minimum as missing', () => {
    const files = [
      makeFile('Drawing -3.pdf'),
      makeFile('Drawing -5.pdf')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    expect(documents[0].missingRevisions).toEqual([4]);
    expect(documents[0].missingRevisions).not.toContain(0);
    expect(documents[0].missingRevisions).not.toContain(1);
    expect(documents[0].missingRevisions).not.toContain(2);
  });
});

describe('groupFilesIntoDocuments — unversioned files', () => {
  it('separates unversioned files from versioned documents', () => {
    const files = [
      makeFile('Drawing -1.pdf'),
      makeFile('README.txt'),
      makeFile('notes.docx')
    ];
    const { documents, unversionedFiles } = groupFilesIntoDocuments(
      files, 'C:\\docs', 'docs', 'docs'
    );
    expect(documents).toHaveLength(1);
    expect(unversionedFiles).toHaveLength(2);
    expect(unversionedFiles.map((f) => f.fileName).sort()).toEqual(['README.txt', 'notes.docx']);
  });

  it('treats "Document -2 FINAL.pdf" as unversioned', () => {
    const files = [makeFile('Document -2 FINAL.pdf')];
    const { documents, unversionedFiles } = groupFilesIntoDocuments(
      files, 'C:\\docs', 'docs', 'docs'
    );
    expect(documents).toHaveLength(0);
    expect(unversionedFiles).toHaveLength(1);
  });
});

describe('groupFilesIntoDocuments — document identity', () => {
  it('creates separate documents for same name in different directories', () => {
    const filesA = [makeFile('Pump -1.dwg', 'C:\\Factory A\\Drawings')];
    const filesB = [makeFile('Pump -1.dwg', 'C:\\Factory B\\Drawings')];

    const { documents: docsA } = groupFilesIntoDocuments(
      filesA, 'C:\\Factory A\\Drawings', 'Drawings', 'Factory A/Drawings'
    );
    const { documents: docsB } = groupFilesIntoDocuments(
      filesB, 'C:\\Factory B\\Drawings', 'Drawings', 'Factory B/Drawings'
    );

    // They should have different IDs
    expect(docsA[0].id).not.toBe(docsB[0].id);
  });

  it('produces a stable document ID for the same input', () => {
    const id1 = makeDocumentId('C:\\docs', 'Drawing');
    const id2 = makeDocumentId('C:\\docs', 'Drawing');
    expect(id1).toBe(id2);
  });
});

describe('groupFilesIntoDocuments — alphabetical document ordering', () => {
  it('returns documents sorted alphabetically by name', () => {
    const files = [
      makeFile('Zebra -1.pdf'),
      makeFile('Alpha -1.pdf'),
      makeFile('Mango -1.pdf')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    expect(documents.map((d) => d.name)).toEqual(['Alpha', 'Mango', 'Zebra']);
  });
});

describe('groupFilesIntoDocuments — multiple documents', () => {
  it('groups different document names separately', () => {
    const files = [
      makeFile('Drawing -0.pdf'),
      makeFile('Drawing -1.pdf'),
      makeFile('Report -0.pdf'),
      makeFile('Specification -0.docx')
    ];
    const { documents } = groupFilesIntoDocuments(files, 'C:\\docs', 'docs', 'docs');
    expect(documents).toHaveLength(3);
    const names = documents.map((d) => d.name).sort();
    expect(names).toEqual(['Drawing', 'Report', 'Specification']);
  });
});
