import React from 'react';
import {
  MousePointer,
  LassoSelect,
  Pen,
  Highlighter,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  StickyNote,
  Hand,
  ChevronDown,
} from 'lucide-react';
import { ToolType } from '../types/whiteboard';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  activeShape: ToolType;
  setActiveShape: (shape: ToolType) => void;
  isShapeMenuOpen: boolean;
  setIsShapeMenuOpen: (open: boolean) => void;
  highlightedShapeIndex: number;
  setHighlightedShapeIndex: React.Dispatch<React.SetStateAction<number>>;
}

const SHAPES: { type: ToolType; label: string; keyLetter: string; icon: React.ReactNode }[] = [
  { type: 'rectangle', label: 'Rectangle (R)', keyLetter: 'R', icon: <Square className="w-4 h-4" /> },
  { type: 'circle', label: 'Circle (C)', keyLetter: 'C', icon: <Circle className="w-4 h-4" /> },
  { type: 'arrow', label: 'Arrow (A)', keyLetter: 'A', icon: <ArrowRight className="w-4 h-4" /> },
  { type: 'line', label: 'Line (L)', keyLetter: 'L', icon: <Minus className="w-4 h-4" /> },
];

const getShapeIcon = (type: ToolType) => {
  switch (type) {
    case 'rectangle': return <Square className="w-4 h-4" />;
    case 'circle': return <Circle className="w-4 h-4" />;
    case 'arrow': return <ArrowRight className="w-4 h-4" />;
    case 'line': return <Minus className="w-4 h-4" />;
    default: return <Square className="w-4 h-4" />;
  }
};

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  activeShape,
  setActiveShape,
  isShapeMenuOpen,
  setIsShapeMenuOpen,
  highlightedShapeIndex,
  setHighlightedShapeIndex,
}) => {
  const isShapeActive = ['rectangle', 'circle', 'arrow', 'line'].includes(currentTool);

  return (
    <nav 
      aria-label="Drawing Tools"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl backdrop-blur-md shadow-lg border border-slate-200/90 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95 text-slate-700 dark:text-zinc-200 transition-all duration-200"
    >
      {/* ================= GROUP 1: Select & Lasso ================= */}
      {/* 1. Select & Move Tool */}
      <button
        onClick={() => onSelectTool('select')}
        title="Select & Move (1 / V) - Click & drag any element or stroke"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'select'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <MousePointer className="w-4 h-4" />
        <span className="sr-only">Select and Move (1 / V)</span>
      </button>

      {/* 2. Lasso Select Tool */}
      <button
        onClick={() => onSelectTool('lasso')}
        title="Lasso Select (2 / Q) - Draw a freeform loop to select elements"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'lasso'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <LassoSelect className="w-4 h-4" />
        <span className="sr-only">Lasso Select (2 / Q)</span>
      </button>

      {/* Divider 1 - Clearly visible */}
      <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-zinc-700 mx-1 rounded-full opacity-90" />

      {/* ================= GROUP 2: Pen, Highlighter, Shape ================= */}
      {/* 3. Freehand Pen */}
      <button
        onClick={() => onSelectTool('pen')}
        title="Pen (3 / P) - Freehand drawing"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'pen'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Pen className="w-4 h-4" />
        <span className="sr-only">Pen (3 / P)</span>
      </button>

      {/* 4. Highlighter */}
      <button
        onClick={() => onSelectTool('highlighter')}
        title="Highlighter (4 / H) - Semi-transparent emphasis"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'highlighter'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Highlighter className="w-4 h-4" />
        <span className="sr-only">Highlighter (4 / H)</span>
      </button>

      {/* 5. Shapes Selector with Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            if (!isShapeActive) {
              onSelectTool(activeShape);
            } else {
              setIsShapeMenuOpen(!isShapeMenuOpen);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsShapeMenuOpen(true);
          }}
          title={`Shapes (5 / S - Hold 5 to expand, arrows to pick)`}
          className={`relative flex items-center gap-0.5 p-2.5 rounded-xl transition-all ${
            isShapeActive
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
          }`}
        >
          {getShapeIcon(activeShape)}
          <ChevronDown
            className={`w-2.5 h-2.5 opacity-70 transition-transform ${isShapeMenuOpen ? 'rotate-180' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsShapeMenuOpen(!isShapeMenuOpen);
            }}
          />
          <span className="sr-only">Shapes (5 / S)</span>
        </button>

        {/* Dropdown Menu for Shapes */}
        {isShapeMenuOpen && (
          <div
            className="absolute bottom-full left-0 mb-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 min-w-[150px] animate-in fade-in slide-in-from-bottom-2 duration-150 z-40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Pick Shape
            </div>
            {SHAPES.map((item, idx) => {
              const isSelected = activeShape === item.type;
              const isHighlighted = highlightedShapeIndex === idx;
              return (
                <button
                  key={item.type}
                  onClick={() => {
                    setActiveShape(item.type);
                    onSelectTool(item.type);
                    setIsShapeMenuOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedShapeIndex(idx)}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isHighlighted
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : isSelected
                      ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-medium'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1 py-0.5 rounded font-mono ${
                      isHighlighted
                        ? 'bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                </button>
              );
            })}
            <div className="px-2 py-1 text-[9px] text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800 text-center font-mono">
              ↑↓ navigate · ↵ select
            </div>
          </div>
        )}
      </div>

      {/* Divider 2 - Clearly visible */}
      <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-zinc-700 mx-1 rounded-full opacity-90" />

      {/* ================= GROUP 3: Text & Sticky Note ================= */}
      {/* 6. Text Tool */}
      <button
        onClick={() => onSelectTool('text')}
        title="Text (6 / T) - Click anywhere on canvas to type text"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'text'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Type className="w-4 h-4" />
        <span className="sr-only">Text (6 / T)</span>
      </button>

      {/* 7. Sticky Note */}
      <button
        onClick={() => onSelectTool('note')}
        title="Sticky Note (7 / N) - Click anywhere on canvas to place a note"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'note'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <StickyNote className="w-4 h-4" />
        <span className="sr-only">Sticky Note (7 / N)</span>
      </button>

      {/* Divider 3 - Clearly visible */}
      <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-zinc-700 mx-1 rounded-full opacity-90" />

      {/* ================= GROUP 4: Free Hand (Pan) ================= */}
      {/* 8. Free Hand / Pan Canvas */}
      <button
        onClick={() => onSelectTool('pan')}
        title="Free Hand Pan (8 / M / Space) - Pan canvas freely without moving elements"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'pan'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Hand className="w-4 h-4" />
        <span className="sr-only">Free Hand (8 / M)</span>
      </button>
    </nav>
  );
};
