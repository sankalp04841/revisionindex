/**
 * fileIcons.ts
 *
 * Maps file extensions to display labels and Tailwind colour classes.
 * Deliberately does not hardcode a whitelist — unknown extensions get a generic icon.
 */

export interface FileTypeInfo {
  label: string;
  colorClass: string;
  bgClass: string;
}

const EXT_MAP: Record<string, FileTypeInfo> = {
  pdf:  { label: 'PDF',  colorClass: 'text-red-400',    bgClass: 'bg-red-900/20' },
  doc:  { label: 'DOC',  colorClass: 'text-blue-400',   bgClass: 'bg-blue-900/20' },
  docx: { label: 'DOCX', colorClass: 'text-blue-400',   bgClass: 'bg-blue-900/20' },
  xls:  { label: 'XLS',  colorClass: 'text-emerald-400', bgClass: 'bg-emerald-900/20' },
  xlsx: { label: 'XLSX', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-900/20' },
  dwg:  { label: 'DWG',  colorClass: 'text-orange-400', bgClass: 'bg-orange-900/20' },
  dxf:  { label: 'DXF',  colorClass: 'text-orange-400', bgClass: 'bg-orange-900/20' },
  png:  { label: 'PNG',  colorClass: 'text-purple-400', bgClass: 'bg-purple-900/20' },
  jpg:  { label: 'JPG',  colorClass: 'text-purple-400', bgClass: 'bg-purple-900/20' },
  jpeg: { label: 'JPEG', colorClass: 'text-purple-400', bgClass: 'bg-purple-900/20' },
  txt:  { label: 'TXT',  colorClass: 'text-surface-400', bgClass: 'bg-surface-700/50' },
  csv:  { label: 'CSV',  colorClass: 'text-teal-400',   bgClass: 'bg-teal-900/20' },
  zip:  { label: 'ZIP',  colorClass: 'text-yellow-400', bgClass: 'bg-yellow-900/20' },
  pptx: { label: 'PPTX', colorClass: 'text-rose-400',   bgClass: 'bg-rose-900/20' },
  ppt:  { label: 'PPT',  colorClass: 'text-rose-400',   bgClass: 'bg-rose-900/20' },
  svg:  { label: 'SVG',  colorClass: 'text-sky-400',    bgClass: 'bg-sky-900/20' },
};

export function getFileTypeInfo(extension: string): FileTypeInfo {
  const ext = extension.toLowerCase();
  return EXT_MAP[ext] ?? {
    label: extension.toUpperCase() || 'FILE',
    colorClass: 'text-surface-400',
    bgClass: 'bg-surface-700/50'
  };
}

export function groupExtensionLabel(ext: string): string {
  const info = EXT_MAP[ext.toLowerCase()];
  return info ? info.label : ext.toUpperCase();
}
