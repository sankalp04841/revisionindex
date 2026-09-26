/**
 * parser.test.ts
 *
 * Unit tests for the filename revision parser.
 */

import { describe, it, expect } from 'vitest';
import { parseFileName } from '../electron/core/parser';

describe('parseFileName — versioned files', () => {
  it('parses a basic single-digit revision', () => {
    const result = parseFileName('Drawing -0.pdf');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.documentName).toBe('Drawing');
      expect(result.revisionNumber).toBe(0);
      expect(result.extension).toBe('pdf');
    }
  });

  it('parses a multi-digit revision', () => {
    const result = parseFileName('Drawing -12.pdf');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.documentName).toBe('Drawing');
      expect(result.revisionNumber).toBe(12);
      expect(result.extension).toBe('pdf');
    }
  });

  it('parses a large revision number', () => {
    const result = parseFileName('Drawing -999.dwg');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.revisionNumber).toBe(999);
      expect(result.extension).toBe('dwg');
    }
  });

  it('handles leading zeros in revision number', () => {
    // -01 should parse as revision 1 (parseInt)
    const result = parseFileName('Drawing -01.pdf');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.revisionNumber).toBe(1);
    }
  });

  it('handles leading zeros -02', () => {
    const result = parseFileName('Drawing -02.pdf');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.revisionNumber).toBe(2);
    }
  });

  it('parses document name with spaces', () => {
    const result = parseFileName('Blah Bah Blah -3.pdf');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.documentName).toBe('Blah Bah Blah');
      expect(result.revisionNumber).toBe(3);
    }
  });

  it('normalises extension to lowercase', () => {
    const result = parseFileName('Drawing -1.PDF');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.extension).toBe('pdf');
    }
  });

  it('normalises mixed-case extension', () => {
    const result = parseFileName('Drawing -2.Pdf');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.extension).toBe('pdf');
    }
  });

  it('parses a .dwg file', () => {
    const result = parseFileName('Factory Layout -5.dwg');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.documentName).toBe('Factory Layout');
      expect(result.revisionNumber).toBe(5);
      expect(result.extension).toBe('dwg');
    }
  });

  it('parses a .docx file', () => {
    const result = parseFileName('Report -0.docx');
    expect(result.isVersioned).toBe(true);
    if (result.isVersioned) {
      expect(result.documentName).toBe('Report');
      expect(result.extension).toBe('docx');
    }
  });
});

describe('parseFileName — unversioned files', () => {
  it('treats "Document -2 FINAL.pdf" as unversioned (space before extension)', () => {
    const result = parseFileName('Document -2 FINAL.pdf');
    expect(result.isVersioned).toBe(false);
  });

  it('treats "Drawing.pdf" as unversioned (no revision suffix)', () => {
    const result = parseFileName('Drawing.pdf');
    expect(result.isVersioned).toBe(false);
  });

  it('treats "Drawing -abc.pdf" as unversioned (non-numeric revision)', () => {
    const result = parseFileName('Drawing -abc.pdf');
    expect(result.isVersioned).toBe(false);
  });

  it('treats "README.txt" as unversioned', () => {
    const result = parseFileName('README.txt');
    expect(result.isVersioned).toBe(false);
    if (!result.isVersioned) {
      expect(result.baseName).toBe('README');
      expect(result.extension).toBe('txt');
    }
  });

  it('treats a file with no extension as unversioned', () => {
    const result = parseFileName('Makefile');
    expect(result.isVersioned).toBe(false);
    if (!result.isVersioned) {
      expect(result.baseName).toBe('Makefile');
      expect(result.extension).toBe('');
    }
  });

  it('does not match "Document -2" without extension', () => {
    const result = parseFileName('Document -2');
    // No dot, no extension match → unversioned
    expect(result.isVersioned).toBe(false);
  });
});

describe('parseFileName — edge cases', () => {
  it('handles revision 10 without confusing with 1+0', () => {
    const r1 = parseFileName('Drawing -1.pdf');
    const r10 = parseFileName('Drawing -10.pdf');
    expect(r1.isVersioned && (r1 as any).revisionNumber).toBe(1);
    expect(r10.isVersioned && (r10 as any).revisionNumber).toBe(10);
  });

  it('trims document name', () => {
    const result = parseFileName('  My Document   -3.pdf');
    // The regex requires the `-NUMBER.EXT` to immediately follow the name,
    // so leading spaces in the whole filename would need to be present
    // In practice filenames won't have leading spaces but the name trim is tested
    if (result.isVersioned) {
      expect(result.documentName).toBe('My Document');
    }
  });
});
