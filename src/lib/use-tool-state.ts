import { useState, useEffect, useRef, useCallback } from 'react';
import type { ToolId } from '@/types';
import { getToolState, saveToolState } from '@/lib/db';
import { setShareableState } from '@/lib/share';

// Loads a tool's state from IndexedDB, persists updates (debounced, flushed on unmount),
// and registers the latest state so it can be shared via link.
export function useToolState<T extends object>(tool: ToolId, defaults: T) {
  const [state, setState] = useState<T>(defaults);
  const [loaded, setLoaded] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToolState<T>(tool).then((saved) => {
      if (cancelled) return;
      if (saved) setState({ ...defaults, ...saved });
      setLoaded(true);
    });
    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) saveToolState(tool, pendingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  useEffect(() => setShareableState(tool, state), [tool, state]);

  // Tracks the latest state so rapid successive updates build on each other.
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback(
    (patch: Partial<T>) => {
      const next = { ...stateRef.current, ...patch };
      stateRef.current = next;
      setState(next);
      pendingRef.current = next;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (pendingRef.current) saveToolState(tool, pendingRef.current);
        pendingRef.current = null;
      }, 800);
    },
    [tool]
  );

  return { state, update, loaded };
}
