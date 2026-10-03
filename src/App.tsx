import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BoundingBox,
  Point,
  ResizeHandle,
  ShapeType,
  StrokeElement,
  StrokeStyle,
  ToolType,
  Viewport,
  WhiteboardElement,
} from './types/whiteboard';
import {
  distance,
  generateId,
  getCombinedBoundingBox,
  getElementBoundingBox,
  getHandleAtPoint,
  isElementInBox,
  isElementInLasso,
  isPointInElement,
  isPointInRotationHandle,
  moveElement,
  resizeElement,
  rotateElement,
  screenToCanvas,
  setElementRotation,
} from './utils/math';
import { renderWhiteboard } from './utils/canvasRenderer';
import { useWhiteboardHistory } from './hooks/useWhiteboardHistory';
import { TopHeader } from './components/TopHeader';
import { Toolbar } from './components/Toolbar';
import { PropertiesBar } from './components/PropertiesBar';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { WhatsNewModal, CURRENT_APP_VERSION } from './components/WhatsNewModal';
import { AlignmentGuide, calculateAlignmentSnap } from './utils/alignment';
import { EditingState, InlineTextEditor } from './components/InlineTextEditor';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zendraw_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return true;
    }
  });

  // Separate color choices for different tools
  const [penColor, setPenColor] = useState<string>(isDark ? '#f8fafc' : '#0f172a');
  const [noteBgColor, setNoteBgColor] = useState<string>('#fef08a');
  const [textColor, setTextColor] = useState<string>(isDark ? '#ffffff' : '#000000');

  // Sync theme class to document & adjust defaults if matching previous default
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zendraw_theme', 'dark');
      setPenColor((prev) => (prev === '#0f172a' ? '#f8fafc' : prev));
      setTextColor((prev) => (prev === '#000000' ? '#ffffff' : prev));
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zendraw_theme', 'light');
      setPenColor((prev) => (prev === '#f8fafc' ? '#0f172a' : prev));
      setTextColor((prev) => (prev === '#ffffff' ? '#000000' : prev));
    }
  }, [isDark]);

  // Viewport / canvas navigation
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [gridType, setGridType] = useState<'dots' | 'grid' | 'none'>('dots');

  // Tools & properties
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [penSize, setPenSize] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(20);
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('solid');
  const [fillColor, setFillColor] = useState<string>('transparent');

  // History & Elements
  const {
    elements,
    setElements,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearBoard,
  } = useWhiteboardHistory([]);

  // Selection & interaction state
  const [activeShape, setActiveShape] = useState<ToolType>('rectangle');
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState<boolean>(false);
  const [highlightedShapeIndex, setHighlightedShapeIndex] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState<WhiteboardElement | null>(null);
  const [selectionBox, setSelectionBox] = useState<BoundingBox | null>(null);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState<boolean>(false);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [lassoPoints, setLassoPoints] = useState<Point[] | null>(null);

  // Automatically show What's New modal once after every update
  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem('worb_last_seen_version');
      if (lastSeen !== CURRENT_APP_VERSION) {
        setWhatsNewOpen(true);
      }
    } catch {
      // Fallback if localStorage is disabled in iframe
    }
  }, []);

  // Interaction tracking refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const key5HoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const key5IsPressedRef = useRef(false);
  const key5HeldLongEnoughRef = useRef(false);
  const interactionModeRef = useRef<
    'none' | 'drawing' | 'moving' | 'resizing' | 'marquee' | 'panning' | 'erasing' | 'lasso' | 'rotating' | 'two-finger-gesture'
  >('none');
  const dragStartCanvasPosRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartScreenPosRef = useRef<Point>({ x: 0, y: 0 });
  const activeResizeHandleRef = useRef<ResizeHandle | null>(null);
  const initialElementsSnapshotRef = useRef<WhiteboardElement[]>([]);
  const hasMovedRef = useRef<boolean>(false);
  const erasedAnyRef = useRef<boolean>(false);
  const rotationCenterRef = useRef<Point>({ x: 0, y: 0 });
  const initialRotationAngleRef = useRef<number>(0);
  const initialElementsRotationMapRef = useRef<Map<string, number>>(new Map());

  // Multi-touch tracking for phone & tablet gestures
  const activePointersRef = useRef<Map<number, Point>>(new Map());
  const initialPinchDistRef = useRef<number>(0);
  const initialPinchCenterRef = useRef<Point>({ x: 0, y: 0 });
  const initialPinchViewportRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 });
  const touchGestureActiveRef = useRef<boolean>(false);

  // Dynamic canvas sizing with high-DPI support
  const [canvasDimensions, setCanvasDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setCanvasDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Resize canvas buffer ONLY when dimensions change to avoid GPU buffer churn
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasDimensions.width * dpr;
    canvas.height = canvasDimensions.height * dpr;
    canvas.style.width = `${canvasDimensions.width}px`;
    canvas.style.height = `${canvasDimensions.height}px`;
  }, [canvasDimensions]);

  // Redraw canvas with requestAnimationFrame batching for smooth 60fps rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    animId = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);

      renderWhiteboard(ctx, canvasDimensions.width, canvasDimensions.height, {
        elements,
        selectedIds,
        hoveredId,
        viewport,
        isDark,
        gridType,
        currentDraft,
        selectionBox,
        alignmentGuides,
        lassoPoints,
        editingId: editingState?.id,
      });

      ctx.restore();
    });

    return () => cancelAnimationFrame(animId);
  }, [
    elements,
    selectedIds,
    hoveredId,
    viewport,
    isDark,
    gridType,
    currentDraft,
    selectionBox,
    alignmentGuides,
    lassoPoints,
    editingState,
    canvasDimensions,
  ]);

  // Selected elements helper (memoized to prevent recalculations on every render)
  const selectedElements = useMemo(
    () => elements.filter((el) => selectedIds.has(el.id)),
    [elements, selectedIds]
  );

  const isSelectedText = useMemo(
    () => selectedElements.length > 0 && selectedElements.every((e) => e.type === 'text'),
    [selectedElements]
  );
  const isSelectedNote = useMemo(
    () => selectedElements.length > 0 && selectedElements.every((e) => e.type === 'note'),
    [selectedElements]
  );

  // Dedicated active tool color - separates Sticky Notes, Text, and Pen
  const activeToolColor = useMemo(
    () =>
      currentTool === 'note' || isSelectedNote
        ? noteBgColor
        : currentTool === 'text' || isSelectedText
        ? textColor
        : penColor,
    [currentTool, isSelectedNote, isSelectedText, noteBgColor, textColor, penColor]
  );

  // Change properties of selected elements with clean tool separation (memoized handlers)
  const handlePropColorChange = useCallback(
    (newColor: string) => {
      if (currentTool === 'note' || isSelectedNote) {
        setNoteBgColor(newColor);
        if (selectedIds.size > 0) {
          const updated = elements.map((el) => {
            if (selectedIds.has(el.id) && el.type === 'note') {
              return { ...el, color: newColor };
            }
            return el;
          });
          pushState(updated);
        }
      } else if (currentTool === 'text' || isSelectedText) {
        setTextColor(newColor);
        if (selectedIds.size > 0) {
          const updated = elements.map((el) => {
            if (selectedIds.has(el.id) && el.type === 'text') {
              return { ...el, color: newColor };
            }
            return el;
          });
          pushState(updated);
        }
      } else {
        setPenColor(newColor);
        if (selectedIds.size > 0) {
          const updated = elements.map((el) => {
            if (!selectedIds.has(el.id)) return el;
            if (el.type === 'stroke') return { ...el, color: newColor };
            if (el.type === 'shape') return { ...el, strokeColor: newColor };
            return el;
          });
          pushState(updated);
        }
      }
    },
    [currentTool, isSelectedNote, isSelectedText, selectedIds, elements, pushState]
  );

  const handlePropPenSizeChange = useCallback(
    (newSize: number) => {
      setPenSize(newSize);
      if (selectedIds.size > 0) {
        const updated = elements.map((el) => {
          if (!selectedIds.has(el.id)) return el;
          if (el.type === 'stroke') return { ...el, size: newSize };
          if (el.type === 'shape') return { ...el, strokeWidth: newSize };
          return el;
        });
        pushState(updated);
      }
    },
    [selectedIds, elements, pushState]
  );

  const handlePropFontSizeChange = useCallback(
    (newFontSize: number) => {
      setFontSize(newFontSize);
      if (selectedIds.size > 0) {
        const updated = elements.map((el) => {
          if (!selectedIds.has(el.id)) return el;
          if (el.type === 'text') {
            const lines = el.text.split('\n');
            const maxLen = Math.max(...lines.map((l) => l.length));
            const estWidth = Math.max(60, maxLen * (newFontSize * 0.6));
            const estHeight = Math.max(30, lines.length * (newFontSize * 1.35));
            return { ...el, fontSize: newFontSize, width: estWidth, height: estHeight };
          }
          if (el.type === 'note') {
            return { ...el, fontSize: newFontSize };
          }
          return el;
        });
        pushState(updated);
      }
    },
    [selectedIds, elements, pushState]
  );

  const handlePropStrokeStyleChange = useCallback(
    (newStyle: StrokeStyle) => {
      setStrokeStyle(newStyle);
      if (selectedIds.size > 0) {
        const updated = elements.map((el) => {
          if (!selectedIds.has(el.id)) return el;
          if (el.type === 'stroke') return { ...el, strokeStyle: newStyle };
          if (el.type === 'shape') return { ...el, strokeStyle: newStyle };
          return el;
        });
        pushState(updated);
      }
    },
    [selectedIds, elements, pushState]
  );

  // Grouping helper: Expands any set of element IDs to include their grouped siblings
  const expandSelectionToGroups = useCallback(
    (ids: Set<string>, allElements: WhiteboardElement[]): Set<string> => {
      const result = new Set(ids);
      const groupIds = new Set<string>();

      for (const el of allElements) {
        if (ids.has(el.id) && el.groupId) {
          groupIds.add(el.groupId);
        }
      }

      if (groupIds.size > 0) {
        for (const el of allElements) {
          if (el.groupId && groupIds.has(el.groupId)) {
            result.add(el.id);
          }
        }
      }

      return result;
    },
    []
  );

  // Group elements: Ctrl+G
  const handleGroup = useCallback(() => {
    if (selectedIds.size < 2) return;
    const newGroupId = `group-${generateId()}`;
    const updated = elements.map((el) => {
      if (selectedIds.has(el.id)) {
        return { ...el, groupId: newGroupId };
      }
      return el;
    });
    pushState(updated);
  }, [selectedIds, elements, pushState]);

  // Ungroup elements: Ctrl+Shift+G
  const handleUngroup = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updated = elements.map((el) => {
      if (selectedIds.has(el.id)) {
        const { groupId: _, ...rest } = el;
        return rest as WhiteboardElement;
      }
      return el;
    });
    pushState(updated);
  }, [selectedIds, elements, pushState]);

  // Actions on selected elements
  const deleteSelectedElements = useCallback(() => {
    if (selectedIds.size === 0) return;
    const remaining = elements.filter((el) => !selectedIds.has(el.id));
    setSelectedIds(new Set());
    pushState(remaining);
  }, [elements, selectedIds, pushState]);

  const duplicateSelectedElements = useCallback(() => {
    if (selectedIds.size === 0) return;
    const toDuplicate = elements.filter((el) => selectedIds.has(el.id));
    const newSelected = new Set<string>();

    // Map old groupIds to new groupIds to preserve group structure
    const groupMap = new Map<string, string>();
    toDuplicate.forEach((el) => {
      if (el.groupId && !groupMap.has(el.groupId)) {
        groupMap.set(el.groupId, `group-${generateId()}`);
      }
    });

    const duplicated: WhiteboardElement[] = toDuplicate.map((el) => {
      const newId = generateId();
      newSelected.add(newId);
      const moved = moveElement(el, 30, 30);
      const newGroupId = el.groupId ? groupMap.get(el.groupId) : undefined;
      return {
        ...moved,
        id: newId,
        zIndex: Date.now() + Math.random(),
        ...(newGroupId ? { groupId: newGroupId } : {}),
      };
    });

    const updated = [...elements, ...duplicated];
    setSelectedIds(newSelected);
    pushState(updated);
  }, [elements, selectedIds, pushState]);

  const bringToFront = useCallback(() => {
    if (selectedIds.size === 0) return;
    const maxZ = Math.max(0, ...elements.map((e) => e.zIndex));
    const updated = elements.map((el) => {
      if (selectedIds.has(el.id)) {
        return { ...el, zIndex: maxZ + 1 };
      }
      return el;
    });
    pushState(updated);
  }, [selectedIds, elements, pushState]);

  const handleRotateCW = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updated = elements.map((el) => {
      if (selectedIds.has(el.id)) {
        return rotateElement(el, 90);
      }
      return el;
    });
    pushState(updated);
  }, [elements, selectedIds, pushState]);

  const handleRotateCCW = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updated = elements.map((el) => {
      if (selectedIds.has(el.id)) {
        return rotateElement(el, -90);
      }
      return el;
    });
    pushState(updated);
  }, [elements, selectedIds, pushState]);

  const handleResetRotation = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updated = elements.map((el) => {
      if (selectedIds.has(el.id)) {
        return setElementRotation(el, 0);
      }
      return el;
    });
    pushState(updated);
  }, [elements, selectedIds, pushState]);

  // Zoom by factor centered at specific screen coordinates
  const zoomAtPoint = useCallback((factor: number, clientX: number, clientY: number) => {
    setViewport((prev) => {
      const newZoom = Math.min(4.0, Math.max(0.15, prev.zoom * factor));
      if (Math.abs(newZoom - prev.zoom) < 0.0001) return prev;

      const mouseCanvas = screenToCanvas(clientX, clientY, prev);
      const newX = clientX - mouseCanvas.x * newZoom;
      const newY = clientY - mouseCanvas.y * newZoom;

      return { x: newX, y: newY, zoom: newZoom };
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    zoomAtPoint(1.12, window.innerWidth / 2, window.innerHeight / 2);
  }, [zoomAtPoint]);

  const handleZoomOut = useCallback(() => {
    zoomAtPoint(1 / 1.12, window.innerWidth / 2, window.innerHeight / 2);
  }, [zoomAtPoint]);

  // Attach native non-passive wheel and pinch gesture listeners to prevent browser page/UI zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasWheel = (e: WheelEvent) => {
      // Must prevent default on non-passive listener so browser does NOT zoom the webpage/UI!
      e.preventDefault();

      if (e.ctrlKey || e.metaKey || e.altKey) {
        // Trackpad pinch-to-zoom or Ctrl+Wheel
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 20; // Line mode
        else if (e.deltaMode === 2) delta *= 100; // Page mode

        // Calibrated smooth continuous zoom
        const sensitivity = 0.0015;
        const clampedDelta = Math.max(-80, Math.min(80, delta));
        const rawFactor = Math.exp(-clampedDelta * sensitivity);
        const zoomFactor = Math.min(1.06, Math.max(0.94, rawFactor));

        zoomAtPoint(zoomFactor, e.clientX, e.clientY);
      } else {
        // Two-finger pan
        setViewport((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    // Global listener to prevent the whole browser window from zooming if pinch happens outside the canvas
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // If event originated outside canvas (e.g. over UI panels), route zoom smoothly to canvas
        if (e.target !== canvas && !canvas.contains(e.target as Node)) {
          let delta = e.deltaY;
          if (e.deltaMode === 1) delta *= 20;
          else if (e.deltaMode === 2) delta *= 100;
          const sensitivity = 0.0015;
          const clampedDelta = Math.max(-80, Math.min(80, delta));
          const rawFactor = Math.exp(-clampedDelta * sensitivity);
          const zoomFactor = Math.min(1.06, Math.max(0.94, rawFactor));
          zoomAtPoint(zoomFactor, e.clientX, e.clientY);
        }
      }
    };

    // Safari gesture events for pinch zoom
    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    window.addEventListener('gesturestart', handleGesture, { passive: false });
    window.addEventListener('gesturechange', handleGesture, { passive: false });
    window.addEventListener('gestureend', handleGesture, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleCanvasWheel);
      window.removeEventListener('wheel', handleGlobalWheel);
      window.removeEventListener('gesturestart', handleGesture);
      window.removeEventListener('gesturechange', handleGesture);
      window.removeEventListener('gestureend', handleGesture);
    };
  }, [zoomAtPoint]);

  // Helper to create and place a new sticky note
  const createStickyNote = (pos?: Point) => {
    const center = pos || screenToCanvas(
      canvasDimensions.width / 2,
      canvasDimensions.height / 2,
      viewport
    );
    const noteWidth = 200;
    const noteHeight = 180;
    const color = noteBgColor || '#fef08a';
    const initialText = '';

    const startX = pos ? Math.round(pos.x) : Math.round(center.x - noteWidth / 2);
    const startY = pos ? Math.round(pos.y) : Math.round(center.y - noteHeight / 2);

    const newNote: WhiteboardElement = {
      id: generateId(),
      type: 'note',
      x: startX,
      y: startY,
      width: noteWidth,
      height: noteHeight,
      text: initialText,
      color,
      textColor: '#1e293b',
      fontSize: 16,
      zIndex: Date.now(),
    };

    pushState([...elements, newNote]);
    setSelectedIds(new Set());

    setEditingState({
      id: newNote.id,
      type: 'note',
      canvasX: newNote.x,
      canvasY: newNote.y,
      initialText,
      fontSize: 16,
      color: '#1e293b',
      bgColor: color,
      width: noteWidth,
      height: noteHeight,
    });
  };

  // Helper to create and place a new text element
  const createTextBox = (pos?: Point) => {
    const center = pos || screenToCanvas(
      canvasDimensions.width / 2,
      canvasDimensions.height / 2,
      viewport
    );
    const currentFontSize = fontSize || 20;
    const initialText = '';
    const estWidth = 160;
    const estHeight = Math.max(36, Math.round(currentFontSize * 1.5));
    const color = textColor || (isDark ? '#ffffff' : '#000000');

    const startX = pos ? Math.round(pos.x) : Math.round(center.x - estWidth / 2);
    const startY = pos ? Math.round(pos.y) : Math.round(center.y - estHeight / 2);

    const newText: WhiteboardElement = {
      id: generateId(),
      type: 'text',
      x: startX,
      y: startY,
      width: estWidth,
      height: estHeight,
      text: initialText,
      fontSize: currentFontSize,
      color,
      zIndex: Date.now(),
    };

    pushState([...elements, newText]);
    setSelectedIds(new Set());

    setEditingState({
      id: newText.id,
      type: 'text',
      canvasX: newText.x,
      canvasY: newText.y,
      initialText,
      fontSize: currentFontSize,
      color,
      width: estWidth,
      height: estHeight,
    });
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (editingState) return; // Finish editing first

    // Track active pointer positions
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch: 2 fingers -> enter 2-finger pinch-to-zoom & pan gesture mode
    if (activePointersRef.current.size >= 2) {
      touchGestureActiveRef.current = true;
      interactionModeRef.current = 'two-finger-gesture';

      // Discard any draft stroke started by the first finger to avoid stray dots
      setCurrentDraft(null);
      setSelectionBox(null);
      setAlignmentGuides([]);

      const pts = Array.from(activePointersRef.current.values());
      const p1 = pts[0];
      const p2 = pts[1];
      initialPinchDistRef.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      initialPinchCenterRef.current = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      initialPinchViewportRef.current = { ...viewport };
      return;
    }

    // If a multi-finger touch gesture is already active, ignore single-finger triggers until all lift
    if (touchGestureActiveRef.current) {
      return;
    }

    const canvasPoint = screenToCanvas(e.clientX, e.clientY, viewport);
    const isTouch = e.pointerType === 'touch';
    const rotTol = isTouch ? 26 : 14;
    const handleTol = (isTouch ? 24 : 10) / viewport.zoom;
    const elTol = (isTouch ? 18 : 8) / viewport.zoom;

    // 1. Text Tool click: place on canvas, start typing, deselect tool at the same time
    if (currentTool === 'text') {
      createTextBox(canvasPoint);
      setCurrentTool('select');
      return;
    }

    // 2. Note Tool click: place on canvas, start typing, deselect tool at the same time
    if (currentTool === 'note') {
      createStickyNote(canvasPoint);
      setCurrentTool('select');
      return;
    }

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    isPointerDownRef.current = true;
    dragStartCanvasPosRef.current = canvasPoint;
    dragStartScreenPosRef.current = { x: e.clientX, y: e.clientY };
    initialElementsSnapshotRef.current = elements;
    hasMovedRef.current = false;
    erasedAnyRef.current = false;

    // Check if middle click or spacebar held -> Pan mode
    if (e.button === 1 || isSpacePressedRef.current || currentTool === 'pan') {
      interactionModeRef.current = 'panning';
      return;
    }

    // 3. Eraser Tool
    if (currentTool === 'eraser') {
      interactionModeRef.current = 'erasing';
      eraseAtPoint(canvasPoint, isTouch);
      return;
    }

    // 4. Drawing Pen / Highlighter
    if (currentTool === 'pen' || currentTool === 'highlighter') {
      interactionModeRef.current = 'drawing';
      const newStroke: StrokeElement = {
        id: generateId(),
        type: 'stroke',
        points: [canvasPoint],
        color: penColor,
        size: penSize,
        isHighlighter: currentTool === 'highlighter',
        strokeStyle: strokeStyle,
        zIndex: Date.now(),
      };
      setCurrentDraft(newStroke);
      return;
    }

    // 5. Shapes (Rectangle, Circle, Line, Arrow)
    if (['rectangle', 'circle', 'line', 'arrow'].includes(currentTool)) {
      interactionModeRef.current = 'drawing';
      const shapeType = currentTool as ShapeType;
      setCurrentDraft({
        id: generateId(),
        type: 'shape',
        shapeType,
        x: canvasPoint.x,
        y: canvasPoint.y,
        width: 0,
        height: 0,
        strokeColor: penColor,
        fillColor: fillColor,
        strokeWidth: penSize,
        strokeStyle: strokeStyle,
        zIndex: Date.now(),
      });
      return;
    }

    // 6. Select & Move Tool
    if (currentTool === 'select') {
      // A: Check if clicked a rotation handle or resize handle of current selection
      if (selectedElements.length > 0) {
        const isSingle = selectedElements.length === 1;
        const singleEl = isSingle ? selectedElements[0] : null;
        const rot = singleEl ? (singleEl.rotation || 0) : 0;
        const baseBox = isSingle
          ? getElementBoundingBox(singleEl!, false)
          : getCombinedBoundingBox(selectedElements);

        if (baseBox) {
          const pad = 6;
          const selBox: BoundingBox = {
            minX: baseBox.minX - pad,
            minY: baseBox.minY - pad,
            maxX: baseBox.maxX + pad,
            maxY: baseBox.maxY + pad,
            width: baseBox.width + pad * 2,
            height: baseBox.height + pad * 2,
          };

          // Check if clicked rotation knob (touch-tolerant)
          if (isPointInRotationHandle(canvasPoint, selBox, viewport.zoom, rot, rotTol)) {
            interactionModeRef.current = 'rotating';
            const midX = selBox.minX + selBox.width / 2;
            const midY = selBox.minY + selBox.height / 2;
            rotationCenterRef.current = { x: midX, y: midY };
            initialRotationAngleRef.current = Math.atan2(canvasPoint.y - midY, canvasPoint.x - midX);

            const map = new Map<string, number>();
            selectedElements.forEach((el) => {
              map.set(el.id, el.rotation || 0);
            });
            initialElementsRotationMapRef.current = map;
            if (canvasRef.current) {
              canvasRef.current.style.cursor = 'grab';
            }
            return;
          }

          // Check if clicked resize handle (touch-tolerant)
          const handle = getHandleAtPoint(canvasPoint, selBox, handleTol, rot);
          if (handle) {
            interactionModeRef.current = 'resizing';
            activeResizeHandleRef.current = handle;
            return;
          }
        }
      }

      // B: Check if clicked directly on any element (touch-tolerant)
      // Check in reverse zIndex (top to bottom)
      const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
      let clickedElement: WhiteboardElement | null = null;
      for (const el of sorted) {
        if (isPointInElement(canvasPoint, el, elTol)) {
          clickedElement = el;
          break;
        }
      }

      if (clickedElement) {
        // Element was clicked!
        if (e.shiftKey) {
          const next = new Set(selectedIds);
          if (next.has(clickedElement.id)) {
            if (clickedElement.groupId) {
              elements.forEach((el) => {
                if (el.groupId === clickedElement!.groupId) next.delete(el.id);
              });
            } else {
              next.delete(clickedElement.id);
            }
            setSelectedIds(next);
          } else {
            next.add(clickedElement.id);
            setSelectedIds(expandSelectionToGroups(next, elements));
          }
        } else if (!selectedIds.has(clickedElement.id)) {
          // Select clicked element and all elements in its group
          setSelectedIds(expandSelectionToGroups(new Set([clickedElement.id]), elements));
        }

        // Start Moving
        interactionModeRef.current = 'moving';
        return;
      }

      // C: Clicked empty canvas -> Clear selection or start Marquee
      if (!e.shiftKey) {
        setSelectedIds(new Set());
      }
      interactionModeRef.current = 'marquee';
      setSelectionBox({
        minX: canvasPoint.x,
        minY: canvasPoint.y,
        maxX: canvasPoint.x,
        maxY: canvasPoint.y,
        width: 0,
        height: 0,
      });
      return;
    }

    // 7. Lasso Selection Tool
    if (currentTool === 'lasso') {
      const clickedSelected = selectedElements.find((el) =>
        isPointInElement(canvasPoint, el, elTol)
      );

      if (clickedSelected) {
        interactionModeRef.current = 'moving';
        return;
      }

      if (!e.shiftKey) {
        setSelectedIds(new Set());
      }
      interactionModeRef.current = 'lasso';
      setLassoPoints([canvasPoint]);
      return;
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Handle 2-finger touch pinch-to-zoom & pan on mobile/touchscreen
    if (activePointersRef.current.size >= 2 && interactionModeRef.current === 'two-finger-gesture') {
      const pts = Array.from(activePointersRef.current.values());
      const p1 = pts[0];
      const p2 = pts[1];
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const currentCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      if (initialPinchDistRef.current > 0) {
        const scale = currentDist / initialPinchDistRef.current;
        const initVp = initialPinchViewportRef.current;
        const targetZoom = Math.min(4.0, Math.max(0.15, initVp.zoom * scale));

        // Canvas point under the initial pinch center
        const initialCenterCanvas = screenToCanvas(
          initialPinchCenterRef.current.x,
          initialPinchCenterRef.current.y,
          initVp
        );

        // Project initial canvas point to current touch midpoint
        const newX = currentCenter.x - initialCenterCanvas.x * targetZoom;
        const newY = currentCenter.y - initialCenterCanvas.y * targetZoom;

        setViewport({ x: newX, y: newY, zoom: targetZoom });
      }
      return;
    }

    if (touchGestureActiveRef.current) {
      return;
    }

    const canvasPoint = screenToCanvas(e.clientX, e.clientY, viewport);

    // If pointer NOT pressed, handle cursor & hover states
    if (!isPointerDownRef.current) {
      if (currentTool === 'select') {
        // Check handle & rotation hover if elements selected
        if (selectedElements.length > 0) {
          const isSingle = selectedElements.length === 1;
          const singleEl = isSingle ? selectedElements[0] : null;
          const rot = singleEl ? (singleEl.rotation || 0) : 0;
          const baseBox = isSingle
            ? getElementBoundingBox(singleEl!, false)
            : getCombinedBoundingBox(selectedElements);

          if (baseBox) {
            const pad = 6;
            const selBox: BoundingBox = {
              minX: baseBox.minX - pad,
              minY: baseBox.minY - pad,
              maxX: baseBox.maxX + pad,
              maxY: baseBox.maxY + pad,
              width: baseBox.width + pad * 2,
              height: baseBox.height + pad * 2,
            };

            // Check rotation handle hover
            if (isPointInRotationHandle(canvasPoint, selBox, viewport.zoom, rot, 14)) {
              e.currentTarget.style.cursor = 'grab';
              return;
            }

            // Check resize handles hover
            const handle = getHandleAtPoint(canvasPoint, selBox, 10 / viewport.zoom, rot);
            if (handle) {
              e.currentTarget.style.cursor = `${handle}-resize`;
              return;
            }
          }
        }

        // Check element hover
        const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
        let hovered: string | null = null;
        for (const el of sorted) {
          if (isPointInElement(canvasPoint, el, 8 / viewport.zoom)) {
            hovered = el.id;
            break;
          }
        }
        setHoveredId(hovered);

        if (hovered) {
          e.currentTarget.style.cursor = selectedIds.has(hovered) ? 'move' : 'pointer';
        } else {
          e.currentTarget.style.cursor = 'default';
        }
      }
      return;
    }

    // Pointer IS pressed - handle active interaction mode
    hasMovedRef.current = true;

    switch (interactionModeRef.current) {
      case 'panning': {
        const dx = e.clientX - dragStartScreenPosRef.current.x;
        const dy = e.clientY - dragStartScreenPosRef.current.y;
        dragStartScreenPosRef.current = { x: e.clientX, y: e.clientY };
        setViewport((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }));
        break;
      }

      case 'erasing': {
        eraseAtPoint(canvasPoint, e.pointerType === 'touch');
        break;
      }

      case 'drawing': {
        if (!currentDraft) break;
        if (currentDraft.type === 'stroke') {
          // Add point to stroke
          setCurrentDraft((prev) => {
            if (!prev || prev.type !== 'stroke') return prev;
            return {
              ...prev,
              points: [...prev.points, canvasPoint],
            };
          });
        } else if (currentDraft.type === 'shape') {
          // Update width/height of shape
          setCurrentDraft((prev) => {
            if (!prev || prev.type !== 'shape') return prev;
            return {
              ...prev,
              width: canvasPoint.x - prev.x,
              height: canvasPoint.y - prev.y,
            };
          });
        }
        break;
      }

      case 'moving': {
        // Move all selected elements with smart alignment snapping
        const rawDx = canvasPoint.x - dragStartCanvasPosRef.current.x;
        const rawDy = canvasPoint.y - dragStartCanvasPosRef.current.y;

        const selectedSnapshot = initialElementsSnapshotRef.current.filter((e) => selectedIds.has(e.id));
        const snapThreshold = 6 / viewport.zoom;
        const { snappedDx, snappedDy, guides } = calculateAlignmentSnap(
          selectedSnapshot,
          initialElementsSnapshotRef.current,
          rawDx,
          rawDy,
          snapThreshold
        );

        setAlignmentGuides(guides);

        setElements(
          initialElementsSnapshotRef.current.map((el) => {
            if (selectedIds.has(el.id)) {
              return moveElement(el, snappedDx, snappedDy);
            }
            return el;
          })
        );
        break;
      }

      case 'resizing': {
        const handle = activeResizeHandleRef.current;
        if (!handle) break;

        const origBox = getCombinedBoundingBox(
          initialElementsSnapshotRef.current.filter((e) => selectedIds.has(e.id))
        );
        if (!origBox) break;

        const delta = {
          x: canvasPoint.x - dragStartCanvasPosRef.current.x,
          y: canvasPoint.y - dragStartCanvasPosRef.current.y,
        };

        // Resize each selected element relative to start snapshot
        const updated = initialElementsSnapshotRef.current.map((el) => {
          if (!selectedIds.has(el.id)) return el;
          return resizeElement(el, origBox, handle, delta);
        });

        setElements(updated);
        break;
      }

      case 'rotating': {
        const center = rotationCenterRef.current;
        const currentAngle = Math.atan2(canvasPoint.y - center.y, canvasPoint.x - center.x);
        const angleDeltaRad = currentAngle - initialRotationAngleRef.current;
        const angleDeltaDeg = (angleDeltaRad * 180) / Math.PI;

        const updated = elements.map((el) => {
          if (selectedIds.has(el.id)) {
            const startRot = initialElementsRotationMapRef.current.get(el.id) || 0;
            let newRot = Math.round((startRot + angleDeltaDeg) % 360);
            if (newRot < 0) newRot += 360;

            // Shift key snaps to 15-degree increments
            if (e.shiftKey) {
              newRot = Math.round(newRot / 15) * 15;
            }

            return {
              ...el,
              rotation: newRot,
            };
          }
          return el;
        });

        setElements(updated);
        break;
      }

      case 'marquee': {
        const start = dragStartCanvasPosRef.current;
        const minX = Math.min(start.x, canvasPoint.x);
        const minY = Math.min(start.y, canvasPoint.y);
        const maxX = Math.max(start.x, canvasPoint.x);
        const maxY = Math.max(start.y, canvasPoint.y);
        const box: BoundingBox = {
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX,
          height: maxY - minY,
        };
        setSelectionBox(box);

        // Dynamically select elements intersecting box
        const matchingIds = new Set<string>();
        for (const el of elements) {
          if (isElementInBox(el, box)) {
            matchingIds.add(el.id);
          }
        }
        setSelectedIds(expandSelectionToGroups(matchingIds, elements));
        break;
      }

      case 'lasso': {
        setLassoPoints((prev) => {
          if (!prev || prev.length === 0) return [canvasPoint];
          const last = prev[prev.length - 1];
          if (distance(last, canvasPoint) >= 3 / viewport.zoom) {
            return [...prev, canvasPoint];
          }
          return prev;
        });
        break;
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      if (e.pointerId !== undefined) {
        activePointersRef.current.delete(e.pointerId);
      }
      if (e.currentTarget && e.pointerId !== undefined) {
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore if pointer capture already lost
        }
      }
    }

    // Reset touch gesture flag when all fingers are lifted
    if (activePointersRef.current.size === 0) {
      touchGestureActiveRef.current = false;
    }

    // If we were in a two-finger pinch/pan gesture, don't execute single-finger actions
    if (interactionModeRef.current === 'two-finger-gesture') {
      if (activePointersRef.current.size === 0) {
        interactionModeRef.current = 'none';
        isPointerDownRef.current = false;
      }
      return;
    }

    isPointerDownRef.current = false;
    const mode = interactionModeRef.current;
    interactionModeRef.current = 'none';
    setSelectionBox(null);
    setAlignmentGuides([]);

    // 1. Commit stroke or shape
    if (mode === 'drawing' && currentDraft) {
      if (currentDraft.type === 'stroke' && currentDraft.points.length > 0) {
        pushState([...elements, currentDraft]);
      } else if (currentDraft.type === 'shape') {
        const minSize = 4;
        if (Math.abs(currentDraft.width) >= minSize || Math.abs(currentDraft.height) >= minSize) {
          pushState([...elements, currentDraft]);
        }
      }
      setCurrentDraft(null);
      setSelectedIds(new Set());
    }

    // 2. Commit movement, resize, or rotation to history
    if ((mode === 'moving' || mode === 'resizing' || mode === 'rotating') && hasMovedRef.current) {
      pushState(elements);
    }

    // 3. Commit eraser changes
    if (mode === 'erasing' && erasedAnyRef.current) {
      pushState(elements);
    }

    // 4. Commit Lasso selection
    if (mode === 'lasso' && lassoPoints && lassoPoints.length >= 3) {
      let polyMinX = Infinity;
      let polyMaxX = -Infinity;
      let polyMinY = Infinity;
      let polyMaxY = -Infinity;
      for (const p of lassoPoints) {
        if (p.x < polyMinX) polyMinX = p.x;
        if (p.x > polyMaxX) polyMaxX = p.x;
        if (p.y < polyMinY) polyMinY = p.y;
        if (p.y > polyMaxY) polyMaxY = p.y;
      }
      const polyBox: BoundingBox = {
        minX: polyMinX,
        minY: polyMinY,
        maxX: polyMaxX,
        maxY: polyMaxY,
        width: polyMaxX - polyMinX,
        height: polyMaxY - polyMinY,
      };

      const matchingIds = new Set<string>(e?.shiftKey ? selectedIds : []);
      for (const el of elements) {
        if (isElementInLasso(el, lassoPoints, polyBox)) {
          matchingIds.add(el.id);
        }
      }
      setSelectedIds(expandSelectionToGroups(matchingIds, elements));
    }
    setLassoPoints(null);
  };

  // Erase helper (touch-aware tolerance)
  const eraseAtPoint = (point: Point, isTouch = false) => {
    const tolerance = (isTouch ? 22 : 12) / viewport.zoom;
    const remaining = elements.filter((el) => !isPointInElement(point, el, tolerance));
    if (remaining.length !== elements.length) {
      erasedAnyRef.current = true;
      setElements(remaining);
      // Remove erased ids from selected
      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const el of remaining) {
          if (prev.has(el.id)) next.add(el.id);
        }
        return next;
      });
    }
  };

  // Double click on canvas: Edit text or sticky note, or create quick text
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasPoint = screenToCanvas(e.clientX, e.clientY, viewport);
    const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    for (const el of sorted) {
      if (isPointInElement(canvasPoint, el, 8 / viewport.zoom)) {
        if (el.type === 'text') {
          setEditingState({
            id: el.id,
            type: 'text',
            canvasX: el.x,
            canvasY: el.y,
            initialText: el.text,
            fontSize: el.fontSize,
            color: el.color,
            rotation: el.rotation,
          });
          return;
        } else if (el.type === 'note') {
          setEditingState({
            id: el.id,
            type: 'note',
            canvasX: el.x,
            canvasY: el.y,
            initialText: el.text,
            fontSize: el.fontSize,
            color: el.textColor,
            bgColor: el.color,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
          });
          return;
        }
      }
    }
  };

  // Inline editor commit
  const handleCommitText = (text: string) => {
    if (!editingState) return;
    const trimmed = text.trim();

    if (!trimmed) {
      // If editing existing and emptied, delete it
      if (editingState.id) {
        pushState(elements.filter((el) => el.id !== editingState.id));
      }
      setSelectedIds(new Set());
      setEditingState(null);
      setCurrentTool('select');
      return;
    }

    if (editingState.id) {
      const updated = elements.map((el) => {
        if (el.id !== editingState.id) return el;
        if (el.type === 'text') {
          const lines = trimmed.split('\n');
          const maxLen = Math.max(...lines.map((l) => l.length));
          const estWidth = Math.max(80, maxLen * (el.fontSize * 0.6) + 20);
          const estHeight = Math.max(30, lines.length * (el.fontSize * 1.35) + 6);
          return { ...el, text: trimmed, width: estWidth, height: estHeight };
        }
        if (el.type === 'note') {
          return { ...el, text: trimmed };
        }
        return el;
      });
      pushState(updated);
    }

    setSelectedIds(new Set());
    setEditingState(null);
    setCurrentTool('select');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if currently typing in an input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Spacebar hold for temporary Pan
      if (e.code === 'Space' && !isSpacePressedRef.current) {
        isSpacePressedRef.current = true;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grab';
        }
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Zoom In (Ctrl + + / Ctrl + =)
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Zoom Out (Ctrl + - / Ctrl + _)
      if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Reset Zoom (Ctrl + 0)
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setViewport({ x: 0, y: 0, zoom: 1 });
        return;
      }

      // Select All Shapes & Elements (Ctrl+A / Cmd+A)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (elements.length > 0) {
          setCurrentTool('select');
          setSelectedIds(new Set(elements.map((el) => el.id)));
        }
        return;
      }

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedElements();
        return;
      }

      // Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          deleteSelectedElements();
        }
        return;
      }

      // Deselect / Escape
      if (e.key === 'Escape') {
        if (isShapeMenuOpen) {
          setIsShapeMenuOpen(false);
          return;
        }
        setSelectedIds(new Set());
        setCurrentDraft(null);
        setEditingState(null);
        return;
      }

      // Arrow keys and Enter when shapes menu is open
      if (isShapeMenuOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          setHighlightedShapeIndex((prev) => (prev + 1) % 4);
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setHighlightedShapeIndex((prev) => (prev - 1 + 4) % 4);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const shapeList: ToolType[] = ['rectangle', 'circle', 'arrow', 'line'];
          const chosen = shapeList[highlightedShapeIndex] || 'rectangle';
          setActiveShape(chosen);
          setCurrentTool(chosen);
          setIsShapeMenuOpen(false);
          return;
        }
      }

      // Arrow keys nudge selected (when shapes menu is closed)
      if (selectedIds.size > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const updated = elements.map((el) => {
          if (selectedIds.has(el.id)) {
            return moveElement(el, dx, dy);
          }
          return el;
        });
        pushState(updated);
        return;
      }

      // Grouping: Ctrl+G (Group) / Ctrl+Shift+G (Ungroup)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroup();
        } else {
          handleGroup();
        }
        return;
      }

      // Hold down 5 to expand shapes menu
      if (e.key === '5') {
        if (!key5IsPressedRef.current) {
          key5IsPressedRef.current = true;
          key5HeldLongEnoughRef.current = false;
          if (key5HoldTimerRef.current) clearTimeout(key5HoldTimerRef.current);
          key5HoldTimerRef.current = setTimeout(() => {
            key5HeldLongEnoughRef.current = true;
            setIsShapeMenuOpen(true);
            const shapeList: ToolType[] = ['rectangle', 'circle', 'arrow', 'line'];
            const curIdx = shapeList.indexOf(activeShape);
            setHighlightedShapeIndex(curIdx >= 0 ? curIdx : 0);
          }, 220);
        } else if (e.repeat) {
          key5HeldLongEnoughRef.current = true;
          setIsShapeMenuOpen(true);
        }
        return;
      }

      // Tool shortcuts (1 - 8) & letter aliases:
      // Group 1: 1/V (Select), 2/Q (Lasso)
      // Group 2: 3/P (Pen), 4/H (Highlighter), 5/S (Shapes)
      // Group 3: 6/T (Text), 7/N (Sticky Note)
      // Group 4: 8/M (Free Hand Pan)
      switch (e.key.toLowerCase()) {
        case '1':
        case 'v':
          setCurrentTool('select');
          break;
        case '2':
        case 'q':
          setCurrentTool('lasso');
          break;
        case '3':
        case 'p':
          setCurrentTool('pen');
          break;
        case '4':
        case 'h':
          setCurrentTool('highlighter');
          break;
        case '5':
        case 's':
          setCurrentTool(activeShape);
          break;
        case 'r':
          setActiveShape('rectangle');
          setCurrentTool('rectangle');
          break;
        case 'c':
          setActiveShape('circle');
          setCurrentTool('circle');
          break;
        case 'a':
          setActiveShape('arrow');
          setCurrentTool('arrow');
          break;
        case 'l':
          setActiveShape('line');
          setCurrentTool('line');
          break;
        case '6':
        case 't':
          e.preventDefault();
          setCurrentTool('text');
          setSelectedIds(new Set());
          break;
        case '7':
        case 'n':
          e.preventDefault();
          setCurrentTool('note');
          setSelectedIds(new Set());
          break;
        case '8':
        case 'm':
          e.preventDefault();
          setCurrentTool('pan');
          break;
        case 'e':
          setCurrentTool('eraser');
          break;
        case 'g':
          if (!e.ctrlKey && !e.metaKey) {
            setGridType((prev) => (prev === 'dots' ? 'grid' : prev === 'grid' ? 'none' : 'dots'));
          }
          break;
        case '?':
          setShortcutsModalOpen(true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = currentTool === 'select' ? 'default' : 'crosshair';
        }
      }

      if (e.key === '5') {
        if (key5HoldTimerRef.current) {
          clearTimeout(key5HoldTimerRef.current);
          key5HoldTimerRef.current = null;
        }
        if (!key5HeldLongEnoughRef.current) {
          // Quick tap
          if (!isShapeMenuOpen) {
            setCurrentTool(activeShape);
          } else {
            // Already open: cycle to next shape!
            setHighlightedShapeIndex((prev) => (prev + 1) % 4);
          }
        }
        key5IsPressedRef.current = false;
        key5HeldLongEnoughRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    undo,
    redo,
    duplicateSelectedElements,
    deleteSelectedElements,
    selectedIds,
    elements,
    currentTool,
    activeShape,
    isShapeMenuOpen,
    highlightedShapeIndex,
    pushState,
  ]);

  // Export as PNG (memoized)
  const handleExportPNG = useCallback(() => {
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Calculate bounding box of all elements with padding
    const box = getCombinedBoundingBox(elements);
    const pad = 60;
    const exportW = box ? Math.max(800, box.width + pad * 2) : canvasDimensions.width;
    const exportH = box ? Math.max(600, box.height + pad * 2) : canvasDimensions.height;

    const dpr = 2; // Crisp 2x export
    exportCanvas.width = exportW * dpr;
    exportCanvas.height = exportH * dpr;
    ctx.scale(dpr, dpr);

    const exportViewport: Viewport = box
      ? {
          x: pad - box.minX,
          y: pad - box.minY,
          zoom: 1,
        }
      : viewport;

    renderWhiteboard(ctx, exportW, exportH, {
      elements,
      selectedIds: new Set(),
      hoveredId: null,
      viewport: exportViewport,
      isDark,
      gridType: 'none', // Clean background without grid
    });

    const url = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${Date.now()}.png`;
    a.click();
  }, [elements, canvasDimensions, viewport, isDark]);

  // Export as JSON file (memoized)
  const handleExportJSON = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(elements, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `whiteboard-backup-${Date.now()}.json`;
    a.click();
  }, [elements]);

  const getCanvasCursor = () => {
    if (isSpacePressedRef.current || currentTool === 'pan') return 'grab';
    if (currentTool === 'eraser') return 'crosshair';
    if (currentTool === 'text') return 'text';
    if (currentTool === 'pen' || currentTool === 'highlighter' || currentTool === 'lasso') return 'crosshair';
    if (['rectangle', 'circle', 'line', 'arrow', 'note'].includes(currentTool)) return 'crosshair';
    return 'default';
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none font-['Plus_Jakarta_Sans'] ${isDark ? 'dark bg-[#0f1117]' : 'bg-[#f8fafc]'}`}>
      {/* 1. Top Header */}
      <TopHeader
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClear={clearBoard}
        gridType={gridType}
        onCycleGrid={() => {
          setGridType((g) => (g === 'dots' ? 'grid' : g === 'grid' ? 'none' : 'dots'));
        }}
        viewport={viewport}
        onResetZoom={() => setViewport({ x: 0, y: 0, zoom: 1 })}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        elementsCount={elements.length}
        selectedCount={selectedIds.size}
      />

      {/* 2. Left / Contextual Properties Bar */}
      <PropertiesBar
        currentTool={currentTool}
        selectedElements={selectedElements}
        penSize={penSize}
        onChangePenSize={handlePropPenSizeChange}
        fontSize={fontSize}
        onChangeFontSize={handlePropFontSizeChange}
        currentColor={activeToolColor}
        onChangeColor={handlePropColorChange}
        strokeStyle={strokeStyle}
        onChangeStrokeStyle={handlePropStrokeStyleChange}
        fillColor={fillColor}
        onChangeFillColor={setFillColor}
        isDark={isDark}
        onDuplicate={duplicateSelectedElements}
        onDelete={deleteSelectedElements}
        onBringToFront={bringToFront}
        onDeselect={() => setSelectedIds(new Set())}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        canGroup={selectedIds.size >= 2}
        canUngroup={selectedElements.some((el) => Boolean(el.groupId))}
        onRotateCW={handleRotateCW}
        onRotateCCW={handleRotateCCW}
        onResetRotation={handleResetRotation}
        currentRotation={selectedElements.length > 0 ? (selectedElements[0].rotation || 0) : 0}
      />

      {/* 3. Main High-Performance Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: getCanvasCursor() }}
        className="absolute inset-0 block touch-none"
      />

      {/* 4. Inline Text / Sticky Note Editor */}
      {editingState && (
        <InlineTextEditor
          editingState={editingState}
          viewport={viewport}
          isDark={isDark}
          onCommit={handleCommitText}
          onCancel={() => {
            setEditingState(null);
            setSelectedIds(new Set());
            setCurrentTool('select');
          }}
        />
      )}

      {/* 5. Primary Bottom Floating Toolbar */}
      <Toolbar
        currentTool={currentTool}
        onSelectTool={(tool) => {
          setCurrentTool(tool);
          if (['rectangle', 'circle', 'arrow', 'line'].includes(tool)) {
            setActiveShape(tool);
          }
          if (tool !== 'select') {
            setSelectedIds(new Set());
          }
        }}
        activeShape={activeShape}
        setActiveShape={setActiveShape}
        isShapeMenuOpen={isShapeMenuOpen}
        setIsShapeMenuOpen={setIsShapeMenuOpen}
        highlightedShapeIndex={highlightedShapeIndex}
        setHighlightedShapeIndex={setHighlightedShapeIndex}
        isDark={isDark}
      />

      {/* 6. Helpful Quick Status Bar at bottom right */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden md:flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 font-mono">
        <span className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-zinc-800/50">
          Tools (1-8) · {currentTool === 'select' ? '1: Select & Move' : `Active: ${currentTool}`} · Space+drag to pan
        </span>
      </div>

      {/* 7. Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* 8. What's New / One-Time Update Modal */}
      <WhatsNewModal
        isOpen={whatsNewOpen}
        onClose={() => {
          try {
            localStorage.setItem('worb_last_seen_version', CURRENT_APP_VERSION);
          } catch {
            // Ignore if localStorage unavailable
          }
          setWhatsNewOpen(false);
        }}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />
    </div>
  );
}
