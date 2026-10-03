import React, { useState, useRef } from 'react';
import {
  MousePointer,
  LassoSelect,
  Pen,
  Highlighter,
  Eraser,
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
  isDark?: boolean;
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
  isDark = false,
}) => {
  const isShapeActive = ['rectangle', 'circle', 'arrow', 'line'].includes(currentTool);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = (name: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setActiveTooltip(name);
  };

  const hideTooltip = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 200);
  };

  const triggerClickTooltip = (name: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setActiveTooltip(name);
    tooltipTimerRef.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 1800);
  };

  return (
    <nav 
      aria-label="Drawing Tools"
      style={{
        backgroundColor: isDark ? 'rgba(24, 24, 27, 0.35)' : 'rgba(255, 255, 255, 0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      className="fixed sm:absolute bottom-[max(0.75rem,calc(0.5rem+env(safe-area-inset-bottom)))] sm:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center justify-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-2xl shadow-2xl border border-white/40 dark:border-white/10 text-slate-700 dark:text-zinc-200 transition-all duration-200 max-w-[calc(100vw-1rem)] select-none"
    >
      {/* Floating Tool Name Tooltip Badge on hover & click/touch */}
      {activeTooltip && (
        <div className="absolute -top-9 sm:-top-10 left-1/2 -translate-x-1/2 pointer-events-none z-50 whitespace-nowrap bg-slate-900/90 dark:bg-zinc-800/95 text-white text-[11px] sm:text-xs font-medium px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md border border-white/10 animate-in fade-in zoom-in-95 duration-150">
          {activeTooltip}
        </div>
      )}

      {/* ================= GROUP 1: Select & Lasso ================= */}
      {/* 1. Select & Move Tool */}
      <button
        onClick={() => {
          onSelectTool('select');
          triggerClickTooltip('Select & Move (1 / V)');
        }}
        onMouseEnter={() => showTooltip('Select & Move (1 / V)')}
        onMouseLeave={hideTooltip}
        title="Select & Move (1 / V) - Click & drag any element or stroke"
        className={`relative flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-all ${
          currentTool === 'select'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
        }`}
      >
        <MousePointer className="w-4 h-4" />
        <span className="sr-only">Select and Move (1 / V)</span>
      </button>

      {/* 2. Lasso Select Tool */}
      <button
        onClick={() => {
          onSelectTool('lasso');
          triggerClickTooltip('Lasso Select (2 / Q)');
        }}
        onMouseEnter={() => showTooltip('Lasso Select (2 / Q)')}
        onMouseLeave={hideTooltip}
        title="Lasso Select (2 / Q) - Draw a freeform loop to select elements"
        className={`relative flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-all ${
          currentTool === 'lasso'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
        }`}
      >
        <LassoSelect className="w-4 h-4" />
        <span className="sr-only">Lasso Select (2 / Q)</span>
      </button>

      {/* Divider 1 - Clearly visible */}
      <div className="h-5 sm:h-6 w-[1.5px] bg-black/10 dark:bg-white/15 mx-0.5 sm:mx-1 rounded-full shrink-0" />

      {/* ================= GROUP 2: Pen, Highlighter, Eraser, Shape ================= */}
      {/* 3. Freehand Pen */}
      <button
        onClick={() => {
          onSelectTool('pen');
          triggerClickTooltip('Pen (3 / P)');
        }}
        onMouseEnter={() => showTooltip('Pen (3 / P)')}
        onMouseLeave={hideTooltip}
        title="Pen (3 / P) - Freehand drawing"
        className={`relative flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-all ${
          currentTool === 'pen'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
        }`}
      >
        <Pen className="w-4 h-4" />
        <span className="sr-only">Pen (3 / P)</span>
      </button>

      {/* 4. Highlighter */}
      <button
        onClick={() => {
          onSelectTool('highlighter');
          triggerClickTooltip('Highlighter (4 / H)');
        }}
        onMouseEnter={() => showTooltip('Highlighter (4 / H)')}
        onMouseLeave={hideTooltip}
        title="Highlighter (4 / H) - Semi-transparent emphasis"
        className={`relative flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-all ${
          currentTool === 'highlighter'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
        }`}
      >
        <Highlighter className="w-4 h-4" />
        <span className="sr-only">Highlighter (4 / H)</span>
      </button>

      {/* 5. Eraser Tool */}
      <button
        onClick={() => {
          onSelectTool('eraser');
          triggerClickTooltip('Eraser (E)');
        }}
        onMouseEnter={() => showTooltip('Eraser (E)')}
        onMouseLeave={hideTooltip}
        title="Eraser (E) - Erase drawings and elements"
        className={`relative flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-all ${
          currentTool === 'eraser'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
        }`}
      >
        <Eraser className="w-4 h-4" />
        <span className="sr-only">Eraser (E)</span>
      </button>

      {/* 6. Shapes Selector with Dropdown */}
      <div className="relative shrink-0">
        <button
          onClick={() => {
            if (!isShapeActive) {
              onSelectTool(activeShape);
              triggerClickTooltip(`Shape: ${activeShape} (5 / S)`);
            } else {
              setIsShapeMenuOpen(!isShapeMenuOpen);
              triggerClickTooltip('Shapes Menu (5 / S)');
            }
          }}
          onMouseEnter={() => showTooltip(`Shape: ${activeShape} (5 / S)`)}
          onMouseLeave={hideTooltip}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsShapeMenuOpen(true);
          }}
          title={`Shapes (5 / S - Hold 5 to expand, arrows to pick)`}
          className={`relative flex items-center gap-0.5 p-1.5 sm:p-2.5 rounded-xl transition-all ${
            isShapeActive
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
              : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
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
            style={{
              backgroundColor: isDark ? 'rgba(24, 24, 27, 0.75)' : 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            className="absolute bottom-full left-0 mb-3 border border-white/40 dark:border-white/10 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 min-w-[150px] animate-in fade-in slide-in-from-bottom-2 duration-150 z-40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
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
                    triggerClickTooltip(`Selected ${item.label}`);
                  }}
                  onMouseEnter={() => {
                    setHighlightedShapeIndex(idx);
                    showTooltip(item.label);
                  }}
                  onMouseLeave={hideTooltip}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isHighlighted
                      ? 'bg-indigo-600/20 text-indigo-700 dark:text-indigo-300'
                      : isSelected
                      ? 'bg-white/40 dark:bg-white/15 text-slate-900 dark:text-zinc-100 font-medium'
                      : 'hover:bg-white/30 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300'
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
                        : 'bg-white/30 dark:bg-white/10 text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                </button>
              );
            })}
            <div className="px-2 py-1 text-[9px] text-slate-500 dark:text-zinc-400 border-t border-black/10 dark:border-white/10 text-center font-mono">
              ↑↓ navigate · ↵ select
            </div>
          </div>
        )}
      </div>

      {/* Divider 2 - Clearly visible */}
      <div className="h-5 sm:h-6 w-[1.5px] bg-black/10 dark:bg-white/15 mx-0.5 sm:mx-1 rounded-full shrink-0" />

      {/* ================= GROUP 3: Text & Sticky Note ================= */}
      {/* 7. Text Tool */}
      <button
        onClick={() => {
          onSelectTool('text');
          triggerClickTooltip('Text (6 / T)');
        }}
        onMouseEnter={() => showTooltip('Text (6 / T)')}
        onMouseLeave={hideTooltip}
        title="Text (6 / T) - Click anywhere on canvas to type text"
        className={`relative flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-all ${
          currentTool === 'text'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
        }`}
      >
        <Type className="w-4 h-4" />
        <span className="sr-only">Text (6 / T)</span>
      </button>

      {/* 8. Sticky Note */}
      <button
        onClick={() => {
          onSelectTool('note');
          triggerClickTooltip('Sticky Note (7 / N)');
        }}
        onMouseEnter={() => showTooltip('Sticky Note (7 / N)')}
        onMouseLeave={hideTooltip}
        title="Sticky Note (7 / N) - Click anywhere on canvas to place a note"
        className={`relative flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-all ${
          currentTool === 'note'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
        }`}
      >
        <StickyNote className="w-4 h-4" />
        <span className="sr-only">Sticky Note (7 / N)</span>
      </button>

      {/* Divider 3 - Clearly visible */}
      <div className="h-5 sm:h-6 w-[1.5px] bg-black/10 dark:bg-white/15 mx-0.5 sm:mx-1 rounded-full shrink-0" />

      {/* ================= GROUP 4: Free Hand (Pan) ================= */}
      {/* 9. Free Hand / Pan Canvas */}
      <button
        onClick={() => {
          onSelectTool('pan');
          triggerClickTooltip('Free Hand Pan (8 / M / Space)');
        }}
        onMouseEnter={() => showTooltip('Free Hand Pan (8 / M / Space)')}
        onMouseLeave={hideTooltip}
        title="Free Hand Pan (8 / M / Space) - Pan canvas freely without moving elements"
        className={`relative flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-all ${
          currentTool === 'pan'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-white/40 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
        }`}
      >
        <Hand className="w-4 h-4" />
        <span className="sr-only">Free Hand (8 / M)</span>
      </button>
    </nav>
  );
};
