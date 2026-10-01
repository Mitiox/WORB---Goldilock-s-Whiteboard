import { useState, useCallback, useRef } from 'react';
import { WhiteboardElement } from '../types/whiteboard';

const STORAGE_KEY = 'zendraw_whiteboard_elements_v1';
const MAX_HISTORY = 40;

export function useWhiteboardHistory(initialElements: WhiteboardElement[] = []) {
  const [elements, setElementsState] = useState<WhiteboardElement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return initialElements;
  });

  const historyRef = useRef<{
    past: WhiteboardElement[][];
    future: WhiteboardElement[][];
  }>({
    past: [],
    future: [],
  });

  // Track if we can undo/redo in state to trigger re-renders of buttons
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Debounced persistence to avoid blocking UI thread with synchronous localStorage writes
  const storageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveToStorage = useCallback((items: WhiteboardElement[]) => {
    if (storageTimerRef.current) clearTimeout(storageTimerRef.current);
    storageTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Ignore storage quota errors
      }
    }, 200);
  }, []);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  const setElements = useCallback(
    (action: WhiteboardElement[] | ((prev: WhiteboardElement[]) => WhiteboardElement[])) => {
      setElementsState((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        saveToStorage(next);
        return next;
      });
    },
    [saveToStorage]
  );

  const pushState = useCallback(
    (newElements: WhiteboardElement[]) => {
      setElementsState((prev) => {
        // Fast reference & item identity check before fallback
        if (prev === newElements) return prev;
        if (prev.length === newElements.length && prev.every((el, idx) => el === newElements[idx])) {
          return prev;
        }

        const newPast = [...historyRef.current.past, prev];
        if (newPast.length > MAX_HISTORY) {
          newPast.shift();
        }

        historyRef.current = {
          past: newPast,
          future: [],
        };
        updateHistoryFlags();
        saveToStorage(newElements);
        return newElements;
      });
    },
    [saveToStorage, updateHistoryFlags]
  );

  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;

    setElementsState((current) => {
      const past = [...historyRef.current.past];
      const previousState = past.pop()!;
      
      historyRef.current = {
        past,
        future: [current, ...historyRef.current.future],
      };
      updateHistoryFlags();
      saveToStorage(previousState);
      return previousState;
    });
  }, [saveToStorage, updateHistoryFlags]);

  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;

    setElementsState((current) => {
      const future = [...historyRef.current.future];
      const nextState = future.shift()!;

      historyRef.current = {
        past: [...historyRef.current.past, current],
        future,
      };
      updateHistoryFlags();
      saveToStorage(nextState);
      return nextState;
    });
  }, [saveToStorage, updateHistoryFlags]);

  const clearBoard = useCallback(() => {
    setElementsState((current) => {
      if (current.length === 0) return current;
      const newPast = [...historyRef.current.past, current];
      historyRef.current = {
        past: newPast,
        future: [],
      };
      updateHistoryFlags();
      saveToStorage([]);
      return [];
    });
  }, [saveToStorage, updateHistoryFlags]);

  return {
    elements,
    setElements,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearBoard,
  };
}
