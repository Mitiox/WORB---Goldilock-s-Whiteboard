import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { group: 'Tools (Number Keys)', items: [
      { key: '1', desc: 'Select & Move element(s)' },
      { key: '2', desc: 'Freehand Pen' },
      { key: '3', desc: 'Highlighter' },
      { key: '4', desc: 'Text tool' },
      { key: '5', desc: 'Shapes (Rect, Circle, Arrow, Line)' },
      { key: '6', desc: 'Sticky Note' },
      { key: '7', desc: 'Eraser' },
      { key: '8', desc: 'Pan / Hand tool' },
      { key: 'Space + Drag', desc: 'Quick Pan from any tool' },
    ]},
    { group: 'Actions', items: [
      { key: 'Ctrl + Z', desc: 'Undo' },
      { key: 'Ctrl + Y', desc: 'Redo' },
      { key: 'Ctrl + D', desc: 'Duplicate selected element' },
      { key: 'Del / Backspace', desc: 'Delete selected element' },
      { key: 'Double Click', desc: 'Edit text or sticky note' },
      { key: 'Wheel', desc: 'Zoom in / out' },
      { key: 'Esc', desc: 'Deselect / Cancel current tool' },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 text-slate-800 dark:text-zinc-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-sm">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-3 flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          {shortcuts.map((section) => (
            <div key={section.group} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                {section.group}
              </span>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                  >
                    <span className="text-slate-600 dark:text-zinc-300">{item.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[11px] font-mono text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-slate-800 dark:text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
