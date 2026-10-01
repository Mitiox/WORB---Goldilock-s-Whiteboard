import React from 'react';
import {
  Sparkles,
  X,
  Keyboard,
  Compass,
  CheckCircle2,
  MousePointer,
  LassoSelect,
} from 'lucide-react';

export const CURRENT_APP_VERSION = '1.3.0';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  onClose,
  onOpenShortcuts,
}) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: <LassoSelect className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
      title: 'Multiselect Lasso Tool (Q)',
      desc: 'Draw a freeform loop with your cursor around any strokes, text, or cards to select precisely what you want without rigid rectangle boundaries.',
      badge: 'New Tool',
    },
    {
      icon: <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: 'Tools 1 – 8 Keybinds & Hold 5 for Shapes',
      desc: 'Quickly switch tools with keys 1 to 8. Holding down 5 expands the shapes menu, where you can navigate with ↑ / ↓ arrows and press Enter to select.',
      badge: 'New Shortcut',
    },
    {
      icon: <MousePointer className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
      title: 'Select All Shapes & Elements (Ctrl + A)',
      desc: 'Press Ctrl + A (or Cmd + A) to instantly select all shapes, freehand drawings, notes, and text on your canvas for bulk moving or editing.',
      badge: 'Essential',
    },
    {
      icon: <Compass className="w-5 h-5 text-pink-600 dark:text-pink-400" />,
      title: 'Smart Alignment Guides & Snapping',
      desc: 'Magnetic visual guide lines now appear automatically while moving objects, snapping edges and centers for effortless, pixel-perfect layouts.',
      badge: 'Visual Snapping',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What's New in WORB"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-slate-800 dark:text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">What's New in WORB</h2>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  v{CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Latest improvements and features in this release
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature List */}
        <div className="py-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60"
            >
              <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-700/60 shrink-0 shadow-xs">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                    {item.title}
                  </h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-300">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          {onOpenShortcuts ? (
            <button
              onClick={() => {
                onClose();
                onOpenShortcuts();
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>View all shortcuts (?)</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm hover:shadow transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Got it, let's draw!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
