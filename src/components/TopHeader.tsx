import React, { useState } from 'react';
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
  onOpenShortcuts,
  onOpenWhatsNew,
  onExportPNG,
  onExportJSON,
  elementsCount,
  selectedCount,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <header className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between">
      {/* Left zone: Brand & History controls */}
      <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-xl backdrop-blur-md transition-colors shadow-sm border border-slate-200/70 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100">
        <div className="flex items-center px-2 py-1">
          <span className="font-bold text-base tracking-wider text-indigo-600 dark:text-indigo-400">WORB</span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700/80 mx-0.5" />

        {/* Undo button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
            canUndo
              ? 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200'
              : 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo button */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
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
      <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl backdrop-blur-md transition-colors shadow-sm border border-slate-200/70 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100">
        {/* Zoom Reset / indicator */}
        <button
          onClick={onResetZoom}
          title="Reset Zoom to 100%"
          className="px-2 py-1 text-xs font-mono font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>

        {/* Grid toggle */}
        <button
          onClick={onCycleGrid}
          title={`Grid style: ${gridType}`}
          className={`p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800 ${
            gridType !== 'none' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export whiteboard"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors flex items-center gap-1"
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
              onClick={() => setShowClearConfirm(true)}
              title="Clear Canvas"
              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 text-slate-500 dark:text-zinc-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* What's New button */}
        {onOpenWhatsNew && (
          <button
            onClick={onOpenWhatsNew}
            title="What's New in this version"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">What's New</span>
          </button>
        )}

        {/* Shortcuts button */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
