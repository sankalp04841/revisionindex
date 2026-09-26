/**
 * parser.ts
 *
 * Parses filenames according to the revision naming convention:
 *   <DOCUMENT NAME> -<REVISION>.<EXTENSION>
 *
 * Rules:
 * - The revision is the FINAL `-<integer>` immediately before the extension.
 * - The integer must be a whole non-negative number (no letters, no spaces).
 * - `Document -2 FINAL.pdf` does NOT match (space between number and extension).
 * - Extensions are normalised to lowercase.
 * - Revision numbers parsed with parseInt (leading zeros are fine: -01 → 1).
 */

export interface ParsedFileName {
  /** The document name portion (before the revision suffix) */
  documentName: string;
  /** Parsed revision number */
  revisionNumber: number;
  /** Original extension (without dot), lowercased */
  extension: string;
  /** Whether this file matches the revision convention */
  isVersioned: true;
}

export interface UnversionedFileName {
  /** Original filename without extension */
  baseName: string;
  /** Original extension (without dot), lowercased */
  extension: string;
  isVersioned: false;
}

export type ParseResult = ParsedFileName | UnversionedFileName;

/**
 * Regex: matches filenames of the form:
 *   <anything> -<digits>.<extension>
 *
 * Capture groups:
 *   1: document name (everything before " -<digits>")
 *   2: revision digits
 *   3: extension (without dot)
 *
 * The `\w+` for extension allows multi-char extensions like `.docx`, `.dwg` etc.
 * The extension can also contain numbers (e.g. `.3dm`).
 */
const REVISION_REGEX = /^(.+?) -(\d+)\.(\w+)$/;

/**
 * Parse a raw filename (e.g. "Drawing -3.pdf") and return either a
 * ParsedFileName or an UnversionedFileName.
 *
 * @param fileName  The filename INCLUDING extension, e.g. "Drawing -3.pdf"
 */
export function parseFileName(fileName: string): ParseResult {
  const match = REVISION_REGEX.exec(fileName);
  if (match) {
    const [, documentName, revStr, ext] = match;
    return {
      isVersioned: true,
      documentName: documentName.trim(),
      revisionNumber: parseInt(revStr, 10),
      extension: ext.toLowerCase()
    };
  }

  // Fallback: extract extension from the filename, treat as unversioned
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex > 0) {
    return {
      isVersioned: false,
      baseName: fileName.slice(0, dotIndex),
      extension: fileName.slice(dotIndex + 1).toLowerCase()
    };
  }

  // No extension at all
  return {
    isVersioned: false,
    baseName: fileName,
    extension: ''
  };
}
