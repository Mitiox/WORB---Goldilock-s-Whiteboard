import React, { useState, useRef } from 'react';
import {
  Undo2,
  Redo2,
  Sun,
  Moon,
  Grid,
  Download,
  Trash2,
  HelpCircle,
  FileDown,
  Sparkles,
  Minus,
  Plus,
} from 'lucide-react';
import { Viewport } from '../types/whiteboard';

interface TopHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  gridType: 'dots' | 'grid' | 'none';
  onCycleGrid: () => void;
  viewport: Viewport;
  onResetZoom: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onOpenShortcuts: () => void;
  onOpenWhatsNew?: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  elementsCount: number;
  selectedCount: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  isDark,
  onToggleTheme,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  gridType,
  onCycleGrid,
  viewport,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  onOpenShortcuts,
  onOpenWhatsNew,
  onExportPNG,
  onExportJSON,
  elementsCount,
  selectedCount,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
    <header className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 z-30 pointer-events-none flex items-center justify-between">
      {/* Tooltip Badge on hover & click/touch */}
      {activeTooltip && (
        <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 pointer-events-none z-50 whitespace-nowrap bg-slate-900/90 dark:bg-zinc-800/95 text-white text-[11px] sm:text-xs font-medium px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md border border-white/10 animate-in fade-in zoom-in-95 duration-150">
          {activeTooltip}
        </div>
      )}

      {/* Left zone: Brand & History controls */}
      <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-xl backdrop-blur-md transition-colors shadow-sm border border-slate-200/70 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100">
        <div className="flex items-center px-1 sm:px-1.5 py-0.5">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-7 sm:h-9 w-auto min-w-7 max-w-20 sm:max-w-36 object-contain rounded select-none"
          />
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700/80 mx-0.5" />

        {/* Undo button */}
        <button
          onClick={() => {
            if (canUndo) {
              onUndo();
              triggerClickTooltip('Undo (Ctrl+Z)');
            }
          }}
          onMouseEnter={() => showTooltip('Undo (Ctrl+Z)')}
          onMouseLeave={hideTooltip}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1 sm:p-1.5 rounded-lg transition-colors flex items-center justify-center ${
            canUndo
              ? 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200'
              : 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo button */}
        <button
          onClick={() => {
            if (canRedo) {
              onRedo();
              triggerClickTooltip('Redo (Ctrl+Y)');
            }
          }}
          onMouseEnter={() => showTooltip('Redo (Ctrl+Y)')}
          onMouseLeave={hideTooltip}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1 sm:p-1.5 rounded-lg transition-colors flex items-center justify-center ${
            canRedo
              ? 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200'
              : 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700/80 mx-0.5" />

        {/* Minimal unboxed status info */}
        <div className="px-2 text-xs text-slate-500 dark:text-zinc-400 font-mono tabular-nums hidden md:flex items-center gap-1.5">
          <span>{elementsCount} {elementsCount === 1 ? 'item' : 'items'}</span>
          {selectedCount > 0 && (
            <>
              <span className="text-slate-300 dark:text-zinc-600">·</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {selectedCount} selected
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right zone: View, Theme, Export, Clear, Settings */}
      <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl backdrop-blur-md transition-colors shadow-sm border border-slate-200/70 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100">
        {/* Zoom controls with discrete step buttons and reset */}
        <div className="flex items-center gap-0.5">
          {onZoomOut && (
            <button
              onClick={() => {
                onZoomOut();
                triggerClickTooltip('Zoom Out (Ctrl -)');
              }}
              onMouseEnter={() => showTooltip('Zoom Out (Ctrl -)')}
              onMouseLeave={hideTooltip}
              title="Zoom Out (Ctrl + -)"
              className="hidden sm:flex p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              onResetZoom();
              triggerClickTooltip('Reset Zoom to 100% (Ctrl 0)');
            }}
            onMouseEnter={() => showTooltip('Reset Zoom to 100% (Ctrl 0)')}
            onMouseLeave={hideTooltip}
            title="Reset Zoom to 100% (Ctrl + 0)"
            className="px-1.5 py-0.5 text-xs font-mono font-medium rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
          >
            {Math.round(viewport.zoom * 100)}%
          </button>
          {onZoomIn && (
            <button
              onClick={() => {
                onZoomIn();
                triggerClickTooltip('Zoom In (Ctrl +)');
              }}
              onMouseEnter={() => showTooltip('Zoom In (Ctrl +)')}
              onMouseLeave={hideTooltip}
              title="Zoom In (Ctrl + +)"
              className="hidden sm:flex p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Grid toggle */}
        <button
          onClick={() => {
            onCycleGrid();
            triggerClickTooltip(`Grid: ${gridType === 'dots' ? 'Lines' : gridType === 'grid' ? 'None' : 'Dots'} (G)`);
          }}
          onMouseEnter={() => showTooltip(`Grid: ${gridType} (G)`)}
          onMouseLeave={hideTooltip}
          title={`Grid style: ${gridType}`}
          className={`p-1 sm:p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800 ${
            gridType !== 'none' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => {
            onToggleTheme();
            triggerClickTooltip(isDark ? 'Switched to Light Mode' : 'Switched to Dark Mode');
          }}
          onMouseEnter={() => showTooltip(isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode')}
          onMouseLeave={hideTooltip}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowExportMenu(!showExportMenu);
              triggerClickTooltip('Export Options');
            }}
            onMouseEnter={() => showTooltip('Export whiteboard')}
            onMouseLeave={hideTooltip}
            title="Export whiteboard"
            className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 mt-2 w-44 rounded-xl shadow-lg border border-slate-200 bg-white py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 z-50 animate-in fade-in slide-in-from-top-1"
              onMouseLeave={() => setShowExportMenu(false)}
            >
              <button
                onClick={() => {
                  onExportPNG();
                  setShowExportMenu(false);
                  triggerClickTooltip('Exported PNG');
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Export as PNG image</span>
              </button>
              <button
                onClick={() => {
                  onExportJSON();
                  setShowExportMenu(false);
                  triggerClickTooltip('Saved .json file');
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                <span>Save Board file (.json)</span>
              </button>
            </div>
          )}
        </div>

        {/* Clear Canvas */}
        <div className="relative">
          {showClearConfirm ? (
            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/60 p-0.5 rounded-lg border border-red-200 dark:border-red-900/50">
              <span className="text-[11px] text-red-600 dark:text-red-400 font-medium px-1.5">Clear all?</span>
              <button
                onClick={() => {
                  onClear();
                  setShowClearConfirm(false);
                  triggerClickTooltip('Canvas Cleared');
                }}
                className="px-2 py-0.5 text-[11px] bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowClearConfirm(true);
                triggerClickTooltip('Clear Canvas');
              }}
              onMouseEnter={() => showTooltip('Clear Canvas')}
              onMouseLeave={hideTooltip}
              title="Clear Canvas"
              className="p-1 sm:p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 text-slate-500 dark:text-zinc-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* What's New button */}
        {onOpenWhatsNew && (
          <button
            onClick={() => {
              onOpenWhatsNew();
              triggerClickTooltip("What's New");
            }}
            onMouseEnter={() => showTooltip("What's New")}
            onMouseLeave={hideTooltip}
            title="What's New in this version"
            className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* Shortcuts button */}
        <button
          onClick={() => {
            onOpenShortcuts();
            triggerClickTooltip('Keyboard Shortcuts (?)');
          }}
          onMouseEnter={() => showTooltip('Keyboard Shortcuts (?)')}
          onMouseLeave={hideTooltip}
          title="Keyboard Shortcuts (?)"
          className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
