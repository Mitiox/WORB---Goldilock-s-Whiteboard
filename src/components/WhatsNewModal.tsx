import React, { useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Keyboard,
  CheckCircle2,
  ArrowDown,
} from 'lucide-react';

export const CURRENT_APP_VERSION = '2';

interface ReleaseUpdate {
  version: string;
  date: string;
  isLatest?: boolean;
  items: {
    feature: string;
    description: string;
  }[];
}

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Updates history: v1.3.0 stays, split updates after 1.3.0 into 3-4 releases
  const releases: ReleaseUpdate[] = [
    {
      version: '1.3.0',
      date: 'Foundational Vector Tools',
      items: [
        {
          feature: 'Multiselect Lasso Tool (Q)',
          description: 'Draw a freeform loop around strokes, shapes, and notes to select without box boundaries.',
        },
        {
          feature: 'Tools 1 – 8 Keybinds & Hold 5',
          description: 'Quick number shortcuts for all tools; hold 5 to open shapes menu with arrow key navigation.',
        },
        {
          feature: 'Select All (Ctrl + A)',
          description: 'Instantly select all shapes, drawings, text, and notes on your canvas.',
        },
        {
          feature: 'Smart Alignment Guides',
          description: 'Magnetic center and edge guidelines that snap while moving objects.',
        },
      ],
    },
    {
      version: '1.3.1',
      date: 'Tool Selection & Placement',
      items: [
        {
          feature: 'Click-to-Place Positioning',
          description: 'Text boxes and sticky notes drop at your exact cursor click location instead of screen center.',
        },
        {
          feature: 'Tool Auto-Deselect',
          description: 'Text and note tools automatically revert to Select & Move as soon as placed.',
        },
        {
          feature: 'Clean Canvas Placement',
          description: 'Placed items drop unselected without distracting bounding boxes.',
        },
      ],
    },
    {
      version: '1.3.2',
      date: 'Instant Typing & Canvas Controls',
      items: [
        {
          feature: 'Direct Typing Mode',
          description: 'Placed text boxes and notes start blank with placeholders so you can type immediately.',
        },
        {
          feature: 'Resilient Focus Lock',
          description: 'Cursor focuses immediately and prevents mouse-release from stealing typing focus.',
        },
        {
          feature: 'Grid Toggle Shortcut (G)',
          description: 'Press G to quickly cycle canvas grid between Dots, Grid Lines, and None.',
        },
      ],
    },
    {
      version: '1.3.3',
      date: 'Sticky Note Polish',
      items: [
        {
          feature: 'Subtle Sticky Scrollbars',
          description: 'Slim 5px translucent scrollbar replacing bulky browser defaults on long notes.',
        },
        {
          feature: 'In-Bounds Fit',
          description: 'Sticky note scrollbar stays strictly inside the card with 14px protective padding.',
        },
        {
          feature: 'Overscroll Containment',
          description: 'Prevents accidental canvas panning while scrolling through note text.',
        },
      ],
    },
    {
      version: '1.3.4',
      date: 'Feed Optimization',
      items: [
        {
          feature: 'Compact What\'s New Feed',
          description: 'Streamlined "> Feature: what it does" layout that saves vertical space.',
        },
        {
          feature: 'Bottom-Start Chronology',
          description: 'Modal automatically begins at the bottom to list the latest update immediately.',
        },
        {
          feature: 'Complete Update History',
          description: 'Organized chronological release timeline from v1.3.0 to present.',
        },
      ],
    },
    {
      version: '1.3.5',
      date: 'Element Rotation & Vector Branding',
      items: [
        {
          feature: 'Full Vector Element Rotation',
          description: 'Rotate text, shapes, pen strokes, and notes via the top knob or 90° buttons (Shift snaps 15°).',
        },
        {
          feature: 'Unified SVG Logo & Favicon',
          description: 'Clean vector branding displayed in the header and browser tab via /logo.svg.',
        },
        {
          feature: 'Streamlined Header Actions',
          description: 'What\'s New button shrunk to a clean sparkle icon button matching toolbar design.',
        },
      ],
    },
    {
      version: '2',
      date: 'Latest Release (v2)',
      isLatest: true,
      items: [
        {
          feature: '35% Translucent Glassmorphism',
          description: 'Properties tab and floating toolbar re-engineered with 35% opacity and crisp 6px blur glass styling.',
        },
        {
          feature: 'Mobile Phone Group & Ungroup',
          description: 'Dedicated 1-tap Group (Ctrl+G) and Ungroup (Ctrl+Shift+G) buttons directly inside properties for phone and touch devices.',
        },
        {
          feature: 'Hover & Click Button Tooltips',
          description: 'Live tooltip badges on hover and click/tap across toolbar, shapes, and header buttons.',
        },
        {
          feature: 'Persistent Properties Header',
          description: 'Selection count ("2 selected") and tool titles stay locked and stable while hovering or clicking action buttons.',
        },
      ],
    },
  ];

  // When opening, always scroll to the bottom which lists the latest update
  useEffect(() => {
    if (isOpen) {
      const scrollToBottom = () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      };

      // Immediate attempt, RAF attempt, and short delay attempt to handle rendering
      scrollToBottom();
      const rafId = requestAnimationFrame(scrollToBottom);
      const timer = setTimeout(scrollToBottom, 60);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  const handleScrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What's New in WORB"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 text-slate-800 dark:text-zinc-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Styled consistently with app modals */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <h2 className="font-semibold text-sm">What's New in WORB</h2>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[11px] font-mono text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              v{CURRENT_APP_VERSION}
            </kbd>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleScrollToBottom}
              title="Jump to latest update"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Compact Update Feed */}
        <div
          ref={scrollContainerRef}
          className="py-3 flex-1 overflow-y-auto space-y-3 pr-1.5 sticky-note-scrollbar"
        >
          {releases.map((rel) => (
            <div
              key={rel.version}
              className={`rounded-xl border p-3 transition-colors ${
                rel.isLatest
                  ? 'border-indigo-500/30 dark:border-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30'
              }`}
            >
              {/* Version & Date tag */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold font-mono ${rel.isLatest ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-zinc-300'}`}>
                    v{rel.version}
                  </span>
                  {rel.isLatest && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                      Current
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                  {rel.date}
                </span>
              </div>

              {/* Items in > Feature: what it does format */}
              <div className="space-y-1.5">
                {rel.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 text-xs py-0.5 rounded transition-colors"
                  >
                    <span className={`font-mono font-bold select-none shrink-0 text-xs leading-tight ${rel.isLatest ? 'text-indigo-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                      &gt;
                    </span>
                    <div className="leading-tight text-[11px] md:text-xs">
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {item.feature}:{' '}
                      </span>
                      <span className="text-slate-600 dark:text-zinc-400">
                        {item.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Thank You Text - shifted right above the horizontal line, out of the box */}
        <div className="pt-2 pb-1 text-center shrink-0">
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Thanks to <span className="font-medium text-slate-700 dark:text-zinc-200">kav</span> and <span className="font-medium text-slate-700 dark:text-zinc-200">pogs</span> for being the alpha testers &lt;3
          </p>
        </div>

        {/* Horizontal Line & Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          {onOpenShortcuts ? (
            <button
              onClick={() => {
                onClose();
                onOpenShortcuts();
              }}
              className="text-xs text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 font-medium flex items-center gap-1.5 transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keyboard shortcuts (?)</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-slate-800 dark:text-zinc-200 transition-colors"
          >
            Got it, let's draw!
          </button>
        </div>
      </div>
    </div>
  );
};
