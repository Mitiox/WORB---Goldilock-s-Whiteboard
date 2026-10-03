import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Copy,
  Trash2,
  Layers,
  X,
  Pen,
  Highlighter,
  Type,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  StickyNote,
  Eraser,
  MousePointer,
  Hand,
  ChevronUp,
  LassoSelect,
  RotateCw,
  RotateCcw,
} from 'lucide-react';
import { StrokeStyle, ToolType, WhiteboardElement } from '../types/whiteboard';

const PEN_SIZES = [2, 4, 8, 14];

const NOTE_COLORS = [
  '#fef08a', // Lemon yellow
  '#bbf7d0', // Mint green
  '#bae6fd', // Sky blue
  '#e9d5ff', // Lavender
  '#fed7aa', // Peach
  '#fecdd3', // Blush
  '#27272a', // Dark slate note
];

interface PropertiesBarProps {
  currentTool: ToolType;
  selectedElements: WhiteboardElement[];
  penSize: number;
  onChangePenSize: (size: number) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  currentColor: string;
  onChangeColor: (color: string) => void;
  strokeStyle: StrokeStyle;
  onChangeStrokeStyle: (style: StrokeStyle) => void;
  fillColor: string;
  onChangeFillColor: (color: string) => void;
  isDark: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDeselect: () => void;
  onRotateCW?: () => void;
  onRotateCCW?: () => void;
  onResetRotation?: () => void;
  currentRotation?: number;
}

export const PropertiesBar: React.FC<PropertiesBarProps> = ({
  currentTool,
  selectedElements,
  penSize,
  onChangePenSize,
  fontSize,
  onChangeFontSize,
  currentColor,
  onChangeColor,
  strokeStyle,
  onChangeStrokeStyle,
  fillColor,
  onChangeFillColor,
  isDark,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
  onDeselect,
  onRotateCW,
  onRotateCCW,
  onResetRotation,
  currentRotation = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(250);

  const hasSelection = selectedElements.length > 0;
  // Requirement: Opens ONLY on click - never auto-opens upon selecting elements
  const isExpanded = isOpen;

  const hasTextSelected = selectedElements.some((e) => e.type === 'text');
  const hasNoteSelected = selectedElements.some((e) => e.type === 'note');
  const isOnlyTextOrNoteSelected =
    hasSelection && selectedElements.every((e) => e.type === 'text' || e.type === 'note');
  const isTextOrNoteTool = currentTool === 'text' || currentTool === 'note';

  // Requirement 3: For text and sticky remove the stroke size option, replace with font size slider
  const showFontSize = isTextOrNoteTool || isOnlyTextOrNoteSelected;
  const showStrokeSize =
    !showFontSize &&
    (['pen', 'highlighter', 'rectangle', 'circle', 'line', 'arrow'].includes(currentTool) ||
      (hasSelection && selectedElements.some((e) => e.type === 'stroke' || e.type === 'shape')));

  const isTextTool = currentTool === 'text' || hasTextSelected;
  const isNoteTool = currentTool === 'note' || hasNoteSelected;

  const selectedTextOrNote = selectedElements.find((e) => e.type === 'text' || e.type === 'note');
  const activeFontSize =
    (selectedTextOrNote && 'fontSize' in selectedTextOrNote ? selectedTextOrNote.fontSize : null) ||
    fontSize ||
    20;

  // Measure content height continuously so both width & height animate simultaneously
  useEffect(() => {
    if (contentRef.current) {
      const updateHeight = () => {
        if (contentRef.current) {
          const h = contentRef.current.scrollHeight;
          if (h > 0) setMeasuredHeight(h);
        }
      };
      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [currentTool, hasSelection, showStrokeSize, showFontSize, isTextTool, isNoteTool]);

  // Curated color palette - Requirement 2: white in dark mode and black in light mode
  const defaultHighContrast = isDark ? '#ffffff' : '#000000';
  const colorPalette = [
    defaultHighContrast,
    isDark ? '#000000' : '#ffffff',
    '#64748b', // Slate
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#0ea5e9', // Sky
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#f43f5e', // Rose
  ];

  // Close when clicking outside if open
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleDocumentClick);
    return () => document.removeEventListener('pointerdown', handleDocumentClick);
  }, [isOpen]);

  // Helper to get icon of current selected tool / brush
  const getToolIcon = () => {
    switch (currentTool) {
      case 'pen':
        return <Pen className="w-4 h-4" />;
      case 'highlighter':
        return <Highlighter className="w-4 h-4" />;
      case 'text':
        return <Type className="w-4 h-4" />;
      case 'rectangle':
        return <Square className="w-4 h-4" />;
      case 'circle':
        return <Circle className="w-4 h-4" />;
      case 'arrow':
        return <ArrowUpRight className="w-4 h-4" />;
      case 'line':
        return <Minus className="w-4 h-4" />;
      case 'note':
        return <StickyNote className="w-4 h-4" />;
      case 'eraser':
        return <Eraser className="w-4 h-4" />;
      case 'pan':
        return <Hand className="w-4 h-4" />;
      case 'lasso':
        return <LassoSelect className="w-4 h-4" />;
      case 'select':
      default:
        return <MousePointer className="w-4 h-4" />;
    }
  };

  const bubbleDimension = isMobileScreen ? 38 : 44;
  const panelWidth = isMobileScreen
    ? Math.min(248, typeof window !== 'undefined' ? window.innerWidth - 16 : 248)
    : 288;

  return (
    <div
      ref={containerRef}
      className="absolute top-14 sm:top-16 left-2 sm:left-3 z-30 pointer-events-auto"
    >
      <motion.div
        animate={{
          width: isExpanded ? panelWidth : bubbleDimension,
          height: isExpanded ? measuredHeight : bubbleDimension,
          borderRadius: isExpanded ? 16 : 20,
        }}
        transition={{
          duration: 0.28,
          ease: [0.19, 1, 0.22, 1], // Smooth exponential deceleration, no squashing or snapping
        }}
        onClick={() => {
          if (!isExpanded) {
            setIsOpen(true);
          }
        }}
        className={`relative backdrop-blur-md border border-slate-200/50 sm:border-slate-200/70 bg-white/60 dark:bg-zinc-900/60 sm:bg-white/80 dark:sm:bg-zinc-900/80 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-lg select-none ${
          !isExpanded ? 'cursor-pointer hover:shadow-md' : 'shadow-xl'
        }`}
      >
        {/* 1. Minimized Circle Icon View - positioned at top-left corner */}
        <div
          className="absolute top-0 left-0 w-[38px] h-[38px] sm:w-11 sm:h-11 flex items-center justify-center text-slate-700 dark:text-zinc-200 transition-all duration-200 ease-out z-10"
          style={{
            opacity: isExpanded ? 0 : 1,
            transform: isExpanded ? 'scale(0.75)' : 'scale(1)',
            pointerEvents: isExpanded ? 'none' : 'auto',
          }}
        >
          {getToolIcon()}
          {/* Active Color & Size pip */}
          <span
            className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ring-1 ring-white dark:ring-zinc-900 shadow-xs transition-colors"
            style={{ backgroundColor: currentColor }}
            title={`Tool: ${currentTool}, Color: ${currentColor}, Size: ${penSize}px`}
          />
          {/* Selection indicator badge if items are selected */}
          {hasSelection && (
            <span
              className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[9px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center ring-1 ring-white dark:ring-zinc-900 shadow-xs"
              title={`${selectedElements.length} items selected`}
            >
              {selectedElements.length}
            </span>
          )}
        </div>

        {/* 2. Expanded Content Panel - pre-rendered with smooth fade & translation */}
        <div
          ref={contentRef}
          className="w-[248px] sm:w-72 p-2.5 sm:p-3 flex flex-col gap-2 sm:gap-2.5 transition-all duration-200 ease-out"
          style={{
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: isExpanded ? 'auto' : 'none',
          }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-200 capitalize">
              <span className="text-indigo-600 dark:text-indigo-400">{getToolIcon()}</span>
              <span>
                {hasSelection
                  ? `${selectedElements.length} selected`
                  : `${currentTool} settings`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {hasSelection && (
                <>
                  <button
                    onClick={onDuplicate}
                    title="Duplicate (Ctrl+D)"
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onBringToFront}
                    title="Bring to Front"
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onDelete}
                    title="Delete (Backspace / Del)"
                    className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 text-slate-600 dark:text-zinc-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      onDeselect();
                      setIsOpen(false);
                    }}
                    title="Deselect (Escape)"
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Minimize / Collapse Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                title="Minimize to circle"
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors ml-1"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 1. Size / Thickness customization: Font Size for Text & Sticky Notes, Stroke Size for Strokes & Shapes */}
          {showFontSize ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                <span>Font Size</span>
                <span className="font-mono">{activeFontSize}px</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[14, 18, 24, 32, 44].map((size) => (
                  <button
                    key={size}
                    onClick={() => onChangeFontSize(size)}
                    title={`${size}px font size`}
                    className={`flex-1 h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                      activeFontSize === size
                        ? 'bg-indigo-50 border border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-500 dark:text-indigo-300'
                        : 'bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Continuous Font Size Slider (12px to 72px) */}
              <div className="pt-1">
                <input
                  type="range"
                  min={12}
                  max={72}
                  value={activeFontSize}
                  onChange={(e) => onChangeFontSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          ) : showStrokeSize ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                <span>Stroke Size</span>
                <span className="font-mono">{penSize}px</span>
              </div>
              <div className="flex items-center gap-1.5">
                {PEN_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => onChangePenSize(size)}
                    title={`${size}px thickness`}
                    className={`flex-1 h-7 rounded-lg flex items-center justify-center transition-all ${
                      penSize === size
                        ? 'bg-indigo-50 border border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-500 dark:text-indigo-300'
                        : 'bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent'
                    }`}
                  >
                    <div
                      className="rounded-full bg-current transition-all"
                      style={{ width: Math.max(3, size), height: Math.max(3, size) }}
                    />
                  </button>
                ))}
              </div>

              {/* Continuous slider */}
              <div className="pt-1">
                <input
                  type="range"
                  min={1}
                  max={36}
                  value={penSize}
                  onChange={(e) => onChangePenSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          ) : null}

          {/* 2. Color Selection */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              <span>{isNoteTool ? 'Note Background' : 'Color'}</span>
              <span className="font-mono uppercase text-[10px]">{currentColor}</span>
            </div>

            {/* Note Palette if sticky note */}
            {isNoteTool ? (
              <div className="grid grid-cols-7 gap-1">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onChangeColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border transition-transform ${
                      currentColor.toLowerCase() === color.toLowerCase()
                        ? 'ring-2 ring-indigo-500 scale-110 border-indigo-600'
                        : 'border-black/10 dark:border-white/10 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            ) : (
              /* Normal element palette */
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                {colorPalette.map((color) => {
                  const isSelected = currentColor.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      onClick={() => onChangeColor(color)}
                      style={{ backgroundColor: color }}
                      title={color}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border transition-transform ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110 border-white dark:border-zinc-900'
                          : 'border-slate-300 dark:border-zinc-700 hover:scale-105'
                      }`}
                    />
                  );
                })}

                {/* Custom Color Input */}
                <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-slate-300 dark:border-zinc-700 hover:scale-105 transition-transform">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => onChangeColor(e.target.value)}
                    title="Custom color picker"
                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
                  />
                  <div
                    className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background:
                        'conic-gradient(from 180deg at 50% 50%, #f43f5e, #f59e0b, #10b981, #0ea5e9, #a855f7, #f43f5e)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Stroke Style (Solid, Dashed, Dotted) for pen, shapes, lines */}
          {showStrokeSize && !isNoteTool && (
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Style
              </span>
              <div className="flex items-center gap-1">
                {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => onChangeStrokeStyle(st)}
                    className={`flex-1 py-1 text-xs rounded-md capitalize transition-colors ${
                      strokeStyle === st
                        ? 'bg-slate-200 dark:bg-zinc-800 font-medium text-slate-900 dark:text-zinc-100'
                        : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Rotation controls for selected elements */}
          {hasSelection && onRotateCW && onRotateCCW && (
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-zinc-800 text-xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Rotate
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onRotateCCW}
                  title="Rotate 90° Counter-Clockwise"
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onResetRotation}
                  title="Click to reset rotation to 0°"
                  className="px-2 py-0.5 font-mono text-[11px] rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors font-medium cursor-pointer"
                >
                  {Math.round(currentRotation)}°
                </button>
                <button
                  onClick={onRotateCW}
                  title="Rotate 90° Clockwise"
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
