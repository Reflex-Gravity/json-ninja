import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { subscribeToasts, type ToastItem } from '@/lib/toast';

const DURATION_MS = 3500;

const toneStyles = {
  success: { icon: CheckCircle2, className: 'text-green-500 dark:text-green-400' },
  error: { icon: AlertCircle, className: 'text-red-500 dark:text-red-400' },
  info: { icon: Info, className: 'text-blue-500 dark:text-blue-400' },
};

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(
    () =>
      subscribeToasts((toast) => {
        setToasts((prev) => [...prev.slice(-2), toast]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), DURATION_MS);
      }),
    []
  );

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const { icon: Icon, className } = toneStyles[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200"
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${className}`} />
            <span className="flex-1 break-words">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
