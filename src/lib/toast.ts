export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type Listener = (toast: ToastItem) => void;

let listener: Listener | null = null;
let nextId = 1;

// Fire-and-forget notifications from anywhere (libs, handlers); rendered by <Toaster /> in App.
export function showToast(message: string, tone: ToastTone = 'info') {
  listener?.({ id: nextId++, message, tone });
}

export function subscribeToasts(fn: Listener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
