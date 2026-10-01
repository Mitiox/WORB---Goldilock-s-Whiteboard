import React, { useEffect, useRef } from 'react';
import { Viewport } from '../types/whiteboard';
import { canvasToScreen } from '../utils/math';

export interface EditingState {
  id?: string; // If editing existing element
  type: 'text' | 'note';
  canvasX: number;
  canvasY: number;
  initialText: string;
  fontSize: number;
  color: string;
  bgColor?: string;
  width?: number;
  height?: number;
}

interface InlineTextEditorProps {
  editingState: EditingState;
  viewport: Viewport;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  editingState,
  viewport,
  onCommit,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = React.useState(editingState.initialText);

  const screenPos = canvasToScreen(
    editingState.canvasX,
    editingState.canvasY,
    viewport
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey && editingState.type === 'text') {
      e.preventDefault();
      onCommit(text);
    }
  };

  const isNote = editingState.type === 'note';
  const scaledFontSize = Math.max(12, editingState.fontSize * viewport.zoom);
  const minWidth = isNote ? (editingState.width || 180) * viewport.zoom : 180;
  const minHeight = isNote ? (editingState.height || 160) * viewport.zoom : 40;

  return (
    <div
      className="absolute z-40"
      style={{
        left: screenPos.x,
        top: screenPos.y,
      }}
    >
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommit(text)}
          placeholder={isNote ? 'Write your note...' : 'Type text here...'}
          className={`resize-none border outline-none font-['Plus_Jakarta_Sans'] leading-snug p-2 rounded-lg shadow-md transition-shadow ${
            isNote
              ? 'border-indigo-400 shadow-lg'
              : 'border-indigo-500 bg-white/95 dark:bg-zinc-900/95 dark:border-indigo-400'
          }`}
          style={{
            minWidth: `${minWidth}px`,
            minHeight: `${minHeight}px`,
            fontSize: `${scaledFontSize}px`,
            color: editingState.color,
            backgroundColor: isNote ? editingState.bgColor : undefined,
          }}
        />
        <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center justify-between">
          <span>{isNote ? 'Shift+Enter for line, click outside to save' : 'Enter to save · Esc to cancel'}</span>
        </div>
      </div>
    </div>
  );
};
