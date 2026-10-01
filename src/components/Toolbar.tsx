import React, { useState } from 'react';
import {
  MousePointer,
  Pen,
  Highlighter,
  Type,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  StickyNote,
  Eraser,
  Hand,
  ChevronDown,
} from 'lucide-react';
import { ToolType } from '../types/whiteboard';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  isDark: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
}) => {
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [activeShape, setActiveShape] = useState<ToolType>('rectangle');

  const shapeTools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" />, shortcut: 'R' },
    { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4" />, shortcut: 'C' },
    { id: 'arrow', label: 'Arrow', icon: <ArrowUpRight className="w-4 h-4" />, shortcut: 'A' },
    { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" />, shortcut: 'L' },
  ];

  const isShapeActive = ['rectangle', 'circle', 'arrow', 'line'].includes(currentTool);

  const getShapeIcon = (tool: ToolType) => {
    switch (tool) {
      case 'circle': return <Circle className="w-4 h-4" />;
      case 'arrow': return <ArrowUpRight className="w-4 h-4" />;
      case 'line': return <Minus className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  return (
    <nav 
      aria-label="Drawing Tools"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl backdrop-blur-md shadow-lg border border-slate-200/80 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95 text-slate-700 dark:text-zinc-200 transition-all duration-200"
    >
      {/* 1. Select & Move Tool */}
      <button
        onClick={() => onSelectTool('select')}
        title="Select & Move (1) - Click & drag any element or stroke"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'select'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <MousePointer className="w-4 h-4" />
        <span className="sr-only">Select and Move (1)</span>
      </button>

      <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

      {/* 2. Freehand Pen */}
      <button
        onClick={() => onSelectTool('pen')}
        title="Pen (2) - Freehand drawing"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'pen'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Pen className="w-4 h-4" />
        <span className="sr-only">Pen (2)</span>
      </button>

      {/* 3. Highlighter */}
      <button
        onClick={() => onSelectTool('highlighter')}
        title="Highlighter (3) - Semi-transparent emphasis"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'highlighter'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Highlighter className="w-4 h-4" />
        <span className="sr-only">Highlighter (3)</span>
      </button>

      {/* 4. Text Tool */}
      <button
        onClick={() => onSelectTool('text')}
        title="Text (4) - Click anywhere on canvas to type text"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'text'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Type className="w-4 h-4" />
        <span className="sr-only">Text (4)</span>
      </button>

      {/* 5. Shapes Selector with Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            if (!isShapeActive) {
              onSelectTool(activeShape);
            } else {
              setShowShapeMenu(!showShapeMenu);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowShapeMenu(true);
          }}
          title={`Shapes (5) - Click to draw or right-click to change shape`}
          className={`relative flex items-center gap-0.5 p-2.5 rounded-xl transition-all ${
            isShapeActive
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
          }`}
        >
          {getShapeIcon(activeShape)}
          <ChevronDown
            className={`w-2.5 h-2.5 opacity-70 transition-transform ${showShapeMenu ? 'rotate-180' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowShapeMenu(!showShapeMenu);
            }}
          />
        </button>

        {showShapeMenu && (
          <div
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-50 min-w-32 animate-in fade-in zoom-in-95"
            onMouseLeave={() => setShowShapeMenu(false)}
          >
            {shapeTools.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveShape(s.id);
                  onSelectTool(s.id);
                  setShowShapeMenu(false);
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  currentTool === s.id
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {s.icon}
                  <span>{s.label}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">5</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 6. Sticky Note */}
      <button
        onClick={() => onSelectTool('note')}
        title="Sticky Note (6) - Click to drop a sticky note"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'note'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <StickyNote className="w-4 h-4" />
        <span className="sr-only">Sticky Note (6)</span>
      </button>

      {/* 7. Eraser */}
      <button
        onClick={() => onSelectTool('eraser')}
        title="Eraser (7) - Click or drag over any element/stroke to delete"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'eraser'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Eraser className="w-4 h-4" />
        <span className="sr-only">Eraser (7)</span>
      </button>

      <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

      {/* 8. Pan / Hand Tool */}
      <button
        onClick={() => onSelectTool('pan')}
        title="Hand tool (8 / Space) - Pan canvas without moving elements"
        className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
          currentTool === 'pan'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
            : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}
      >
        <Hand className="w-4 h-4" />
        <span className="sr-only">Pan Canvas (8)</span>
      </button>
    </nav>
  );
};
