/**
 * ToastContainer.tsx
 *
 * Renders toast notifications from the Zustand store.
 */

import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useAppStore, type Toast } from '../../store/documentStore';

const ICONS: Record<Toast['type'], React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
  error:   <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  info:    <Info className="w-4 h-4 text-accent-400 flex-shrink-0" />
};

const BORDER: Record<Toast['type'], string> = {
  success: 'border-emerald-800/50',
  warning: 'border-amber-800/50',
  error:   'border-red-800/50',
  info:    'border-accent-800/50'
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useAppStore((s) => s.removeToast);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl
                  bg-surface-800 border ${BORDER[toast.type]}
                  shadow-xl animate-slide-in-up max-w-sm`}
    >
      {ICONS[toast.type]}
      <p className="text-sm text-surface-200 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-surface-500 hover:text-surface-300 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
