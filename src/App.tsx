import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  isPointInElement,
  moveElement,
  resizeElement,
  screenToCanvas,
} from './utils/math';
import { renderWhiteboard } from './utils/canvasRenderer';
import { useWhiteboardHistory } from './hooks/useWhiteboardHistory';
import { TopHeader } from './components/TopHeader';
import { Toolbar } from './components/Toolbar';
import { PropertiesBar } from './components/PropertiesBar';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { EditingState, InlineTextEditor } from './components/InlineTextEditor';
import { Hand, MousePointer } from 'lucide-react';

const INITIAL_SAMPLE_ELEMENTS: WhiteboardElement[] = [
  {
    id: 'sample-rect-1',
    type: 'shape',
    shapeType: 'rectangle',
    x: 180,
    y: 120,
    width: 320,
    height: 180,
    strokeColor: '#6366f1',
    fillColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid',
    zIndex: 1,
  },
  {
    id: 'sample-text-1',
    type: 'text',
    x: 210,
    y: 155,
    text: 'Moveable Vector Whiteboard\nSelect tool (1) lets you move any element!',
    fontSize: 20,
    color: '#6366f1',
    width: 260,
    height: 60,
    zIndex: 2,
  },
  {
    id: 'sample-stroke-1',
    type: 'stroke',
    color: '#10b981',
    size: 4,
    points: [
      { x: 210, y: 240 },
      { x: 250, y: 255 },
      { x: 300, y: 245 },
      { x: 360, y: 260 },
      { x: 420, y: 245 },
      { x: 460, y: 255 },
    ],
    zIndex: 3,
  },
  {
    id: 'sample-note-1',
    type: 'note',
    x: 540,
    y: 120,
    width: 220,
    height: 180,
    text: 'Every drawing or stroke you sketch can be moved individually.\n\nTry selecting the green stroke on the left and dragging it!',
    color: '#fef08a',
    textColor: '#1e293b',
    fontSize: 15,
    zIndex: 4,
  },
  {
    id: 'sample-arrow-1',
    type: 'shape',
    shapeType: 'arrow',
    x: 510,
    y: 210,
    width: -70,
    height: 30,
    strokeColor: '#f59e0b',
    strokeWidth: 3,
    zIndex: 5,
  }
];

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

  // Sync theme class to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zendraw_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zendraw_theme', 'light');
    }
  }, [isDark]);

  // Viewport / canvas navigation
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [gridType, setGridType] = useState<'dots' | 'grid' | 'none'>('dots');

  // Tools & properties
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [penSize, setPenSize] = useState<number>(4);
  const [currentColor, setCurrentColor] = useState<string>(isDark ? '#f8fafc' : '#0f172a');
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
  } = useWhiteboardHistory(INITIAL_SAMPLE_ELEMENTS);

  // Selection & interaction state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState<WhiteboardElement | null>(null);
  const [selectionBox, setSelectionBox] = useState<BoundingBox | null>(null);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);

  // Interaction tracking refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDownRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const interactionModeRef = useRef<'none' | 'drawing' | 'moving' | 'resizing' | 'marquee' | 'panning' | 'erasing'>('none');
  const dragStartCanvasPosRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartScreenPosRef = useRef<Point>({ x: 0, y: 0 });
  const lastCanvasPosRef = useRef<Point>({ x: 0, y: 0 });
  const activeResizeHandleRef = useRef<ResizeHandle | null>(null);
  const initialElementsSnapshotRef = useRef<WhiteboardElement[]>([]);
  const hasMovedRef = useRef<boolean>(false);
  const erasedAnyRef = useRef<boolean>(false);

  // Dynamic canvas sizing with high-DPI support
  const [canvasDimensions, setCanvasDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setCanvasDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update default contrast color when switching dark/light
  useEffect(() => {
    setCurrentColor((prev) => {
      if (prev === '#0f172a' && isDark) return '#f8fafc';
      if (prev === '#f8fafc' && !isDark) return '#0f172a';
      return prev;
    });
  }, [isDark]);

  // Redraw canvas whenever relevant state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasDimensions.width * dpr;
    canvas.height = canvasDimensions.height * dpr;
    canvas.style.width = `${canvasDimensions.width}px`;
    canvas.style.height = `${canvasDimensions.height}px`;

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
    });
  }, [
    elements,
    selectedIds,
    hoveredId,
    viewport,
    isDark,
    gridType,
    currentDraft,
    selectionBox,
    canvasDimensions,
  ]);

  // Selected elements helper
  const selectedElements = elements.filter((el) => selectedIds.has(el.id));

  // Change properties of selected elements
  const handlePropColorChange = (newColor: string) => {
    setCurrentColor(newColor);
    if (selectedIds.size > 0) {
      const updated = elements.map((el) => {
        if (!selectedIds.has(el.id)) return el;
        if (el.type === 'stroke') return { ...el, color: newColor };
        if (el.type === 'text') return { ...el, color: newColor };
        if (el.type === 'shape') return { ...el, strokeColor: newColor };
        if (el.type === 'note') return { ...el, color: newColor };
        return el;
      });
      pushState(updated);
    }
  };

  const handlePropPenSizeChange = (newSize: number) => {
    setPenSize(newSize);
    if (selectedIds.size > 0) {
      const updated = elements.map((el) => {
        if (!selectedIds.has(el.id)) return el;
        if (el.type === 'stroke') return { ...el, size: newSize };
        if (el.type === 'text') return { ...el, fontSize: newSize };
        if (el.type === 'shape') return { ...el, strokeWidth: newSize };
        return el;
      });
      pushState(updated);
    }
  };

  const handlePropStrokeStyleChange = (newStyle: StrokeStyle) => {
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
  };

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

    const duplicated: WhiteboardElement[] = toDuplicate.map((el) => {
      const newId = generateId();
      newSelected.add(newId);
      const moved = moveElement(el, 30, 30);
      return {
        ...moved,
        id: newId,
        zIndex: Date.now() + Math.random(),
      };
    });

    const updated = [...elements, ...duplicated];
    setSelectedIds(newSelected);
    pushState(updated);
  }, [elements, selectedIds, pushState]);

  const bringToFront = () => {
    if (selectedIds.size === 0) return;
    const maxZ = Math.max(0, ...elements.map((e) => e.zIndex));
    const updated = elements.map((el) => {
      if (selectedIds.has(el.id)) {
        return { ...el, zIndex: maxZ + 1 };
      }
      return el;
    });
    pushState(updated);
  };

  const sendToBack = () => {
    if (selectedIds.size === 0) return;
    const minZ = Math.min(0, ...elements.map((e) => e.zIndex));
    const updated = elements.map((el) => {
      if (selectedIds.has(el.id)) {
        return { ...el, zIndex: minZ - 1 };
      }
      return el;
    });
    pushState(updated);
  };

  // Wheel zoom / pan
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(4.0, Math.max(0.15, viewport.zoom * zoomFactor));

      const mouseCanvas = screenToCanvas(e.clientX, e.clientY, viewport);
      const newX = e.clientX - mouseCanvas.x * newZoom;
      const newY = e.clientY - mouseCanvas.y * newZoom;

      setViewport({ x: newX, y: newY, zoom: newZoom });
    } else {
      // Pan
      setViewport((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (editingState) return; // Finish editing first
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const canvasPoint = screenToCanvas(e.clientX, e.clientY, viewport);
    isPointerDownRef.current = true;
    dragStartCanvasPosRef.current = canvasPoint;
    dragStartScreenPosRef.current = { x: e.clientX, y: e.clientY };
    lastCanvasPosRef.current = canvasPoint;
    initialElementsSnapshotRef.current = elements;
    hasMovedRef.current = false;
    erasedAnyRef.current = false;

    // Check if middle click or spacebar held -> Pan mode
    if (e.button === 1 || isSpacePressedRef.current || currentTool === 'pan') {
      interactionModeRef.current = 'panning';
      return;
    }

    // 1. Text Tool click
    if (currentTool === 'text') {
      setEditingState({
        type: 'text',
        canvasX: canvasPoint.x,
        canvasY: canvasPoint.y,
        initialText: '',
        fontSize: penSize * 4 >= 14 ? penSize * 4 : 20,
        color: currentColor,
      });
      return;
    }

    // 2. Note Tool click
    if (currentTool === 'note') {
      setEditingState({
        type: 'note',
        canvasX: canvasPoint.x,
        canvasY: canvasPoint.y,
        initialText: '',
        fontSize: 15,
        color: '#1e293b',
        bgColor: currentColor.startsWith('#') && currentColor !== '#f8fafc' && currentColor !== '#0f172a' ? currentColor : '#fef08a',
        width: 220,
        height: 180,
      });
      return;
    }

    // 3. Eraser Tool
    if (currentTool === 'eraser') {
      interactionModeRef.current = 'erasing';
      eraseAtPoint(canvasPoint);
      return;
    }

    // 4. Drawing Pen / Highlighter
    if (currentTool === 'pen' || currentTool === 'highlighter') {
      interactionModeRef.current = 'drawing';
      const newStroke: StrokeElement = {
        id: generateId(),
        type: 'stroke',
        points: [canvasPoint],
        color: currentColor,
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
        strokeColor: currentColor,
        fillColor: fillColor,
        strokeWidth: penSize,
        strokeStyle: strokeStyle,
        zIndex: Date.now(),
      });
      return;
    }

    // 6. Select & Move Tool
    if (currentTool === 'select') {
      // A: Check if clicked a resize handle of current selection
      const selBox = getCombinedBoundingBox(selectedElements);
      if (selBox) {
        const handle = getHandleAtPoint(canvasPoint, selBox, 10 / viewport.zoom);
        if (handle) {
          interactionModeRef.current = 'resizing';
          activeResizeHandleRef.current = handle;
          return;
        }
      }

      // B: Check if clicked directly on any element
      // Check in reverse zIndex (top to bottom)
      const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
      let clickedElement: WhiteboardElement | null = null;
      for (const el of sorted) {
        if (isPointInElement(canvasPoint, el, 8 / viewport.zoom)) {
          clickedElement = el;
          break;
        }
      }

      if (clickedElement) {
        // Element was clicked!
        if (e.shiftKey) {
          // Toggle selection
          const next = new Set(selectedIds);
          if (next.has(clickedElement.id)) next.delete(clickedElement.id);
          else next.add(clickedElement.id);
          setSelectedIds(next);
        } else if (!selectedIds.has(clickedElement.id)) {
          // Select single clicked element
          setSelectedIds(new Set([clickedElement.id]));
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
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvasPoint = screenToCanvas(e.clientX, e.clientY, viewport);

    // If pointer NOT pressed, handle cursor & hover states
    if (!isPointerDownRef.current) {
      if (currentTool === 'select') {
        // Check handle hover
        const selBox = getCombinedBoundingBox(selectedElements);
        if (selBox) {
          const handle = getHandleAtPoint(canvasPoint, selBox, 10 / viewport.zoom);
          if (handle) {
            e.currentTarget.style.cursor = `${handle}-resize`;
            return;
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
        eraseAtPoint(canvasPoint);
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
        // Move all selected elements
        const dx = canvasPoint.x - lastCanvasPosRef.current.x;
        const dy = canvasPoint.y - lastCanvasPosRef.current.y;
        lastCanvasPosRef.current = canvasPoint;

        setElements((prev) =>
          prev.map((el) => {
            if (selectedIds.has(el.id)) {
              return moveElement(el, dx, dy);
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
        setSelectedIds(matchingIds);
        break;
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && e.currentTarget && e.pointerId !== undefined) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore if pointer capture already lost
      }
    }
    isPointerDownRef.current = false;
    const mode = interactionModeRef.current;
    interactionModeRef.current = 'none';
    setSelectionBox(null);

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
    }

    // 2. Commit movement or resize to history
    if ((mode === 'moving' || mode === 'resizing') && hasMovedRef.current) {
      pushState(elements);
    }

    // 3. Commit eraser changes
    if (mode === 'erasing' && erasedAnyRef.current) {
      pushState(elements);
    }
  };

  // Erase helper
  const eraseAtPoint = (point: Point) => {
    const tolerance = 12 / viewport.zoom;
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
          });
          return;
        }
      }
    }

    // If double clicked empty canvas in Select mode, create quick text!
    if (currentTool === 'select') {
      setEditingState({
        type: 'text',
        canvasX: canvasPoint.x,
        canvasY: canvasPoint.y,
        initialText: '',
        fontSize: 20,
        color: currentColor,
      });
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
      setEditingState(null);
      return;
    }

    if (editingState.id) {
      // Update existing
      const updated = elements.map((el) => {
        if (el.id !== editingState.id) return el;
        if (el.type === 'text') {
          return { ...el, text: trimmed };
        }
        if (el.type === 'note') {
          return { ...el, text: trimmed };
        }
        return el;
      });
      pushState(updated);
    } else {
      // Create new
      if (editingState.type === 'text') {
        const lines = trimmed.split('\n');
        const maxLen = Math.max(...lines.map((l) => l.length));
        const estWidth = Math.max(60, maxLen * (editingState.fontSize * 0.6));
        const estHeight = Math.max(30, lines.length * (editingState.fontSize * 1.35));

        const newTextEl: WhiteboardElement = {
          id: generateId(),
          type: 'text',
          x: editingState.canvasX,
          y: editingState.canvasY,
          text: trimmed,
          fontSize: editingState.fontSize,
          color: editingState.color,
          width: estWidth,
          height: estHeight,
          zIndex: Date.now(),
        };

        setSelectedIds(new Set([newTextEl.id]));
        pushState([...elements, newTextEl]);
      } else {
        const newNoteEl: WhiteboardElement = {
          id: generateId(),
          type: 'note',
          x: editingState.canvasX,
          y: editingState.canvasY,
          width: editingState.width || 220,
          height: editingState.height || 180,
          text: trimmed,
          color: editingState.bgColor || '#fef08a',
          textColor: editingState.color || '#1e293b',
          fontSize: editingState.fontSize || 15,
          zIndex: Date.now(),
        };

        setSelectedIds(new Set([newNoteEl.id]));
        pushState([...elements, newNoteEl]);
      }
    }
    setEditingState(null);
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
        setSelectedIds(new Set());
        setCurrentDraft(null);
        setEditingState(null);
        return;
      }

      // Arrow keys nudge selected
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

      // Number key tool shortcuts (1 - 8) & letter aliases
      switch (e.key.toLowerCase()) {
        case '1':
        case 'v':
          setCurrentTool('select');
          break;
        case '2':
        case 'p':
          setCurrentTool('pen');
          break;
        case '3':
        case 'h':
          setCurrentTool('highlighter');
          break;
        case '4':
        case 't':
          setCurrentTool('text');
          break;
        case '5':
        case 'r':
          setCurrentTool('rectangle');
          break;
        case 'c':
          setCurrentTool('circle');
          break;
        case 'a':
          setCurrentTool('arrow');
          break;
        case 'l':
          setCurrentTool('line');
          break;
        case '6':
        case 'n':
          setCurrentTool('note');
          break;
        case '7':
        case 'e':
          setCurrentTool('eraser');
          break;
        case '8':
        case 'm':
          setCurrentTool('pan');
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
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, duplicateSelectedElements, deleteSelectedElements, selectedIds, elements, currentTool, pushState]);

  // Export as PNG
  const handleExportPNG = () => {
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
  };

  // Export as JSON file
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(elements, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `whiteboard-backup-${Date.now()}.json`;
    a.click();
  };

  const getCanvasCursor = () => {
    if (isSpacePressedRef.current || currentTool === 'pan') return 'grab';
    if (currentTool === 'eraser') return 'crosshair';
    if (currentTool === 'text') return 'text';
    if (currentTool === 'pen' || currentTool === 'highlighter') return 'crosshair';
    if (['rectangle', 'circle', 'line', 'arrow', 'note'].includes(currentTool)) return 'crosshair';
    return 'default';
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none font-['Plus_Jakarta_Sans'] ${isDark ? 'dark bg-[#0f1117]' : 'bg-[#f8fafc]'}`}>
      {/* 1. Top Header */}
      <TopHeader
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
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
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
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
        currentColor={currentColor}
        onChangeColor={handlePropColorChange}
        strokeStyle={strokeStyle}
        onChangeStrokeStyle={handlePropStrokeStyleChange}
        fillColor={fillColor}
        onChangeFillColor={setFillColor}
        isDark={isDark}
        onDuplicate={duplicateSelectedElements}
        onDelete={deleteSelectedElements}
        onBringToFront={bringToFront}
        onSendToBack={sendToBack}
        onDeselect={() => setSelectedIds(new Set())}
      />

      {/* 3. Main High-Performance Canvas */}
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
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
          onCommit={handleCommitText}
          onCancel={() => setEditingState(null)}
        />
      )}

      {/* 5. Primary Bottom Floating Toolbar */}
      <Toolbar
        currentTool={currentTool}
        onSelectTool={(tool) => {
          setCurrentTool(tool);
          if (tool !== 'select') {
            setSelectedIds(new Set());
          }
        }}
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
    </div>
  );
}
