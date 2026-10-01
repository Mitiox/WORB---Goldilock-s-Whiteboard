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
  isDark?: boolean;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  editingState,
  viewport,
  isDark = false,
  onCommit,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = React.useState(editingState.initialText);

  const isNote = editingState.type === 'note';

  // For sticky note, the canvas note renderer uses padding of 14px
  const notePadding = 14 * viewport.zoom;
  const screenPos = canvasToScreen(
    editingState.canvasX,
    editingState.canvasY,
    viewport
  );

  const posX = isNote ? screenPos.x + notePadding : screenPos.x;
  const posY = isNote ? screenPos.y + notePadding : screenPos.y;

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 24)}px`;
    }
  };

  useEffect(() => {
    setText(editingState.initialText);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize();
    }
  }, [editingState.initialText, editingState.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey && !isNote) {
      e.preventDefault();
      onCommit(text);
    }
  };

  const scaledFontSize = Math.max(12, editingState.fontSize * viewport.zoom);
  const noteInnerWidth = ((editingState.width || 200) - 28) * viewport.zoom;
  const noteInnerHeight = ((editingState.height || 180) - 28) * viewport.zoom;

  const effectiveTextColor =
    editingState.color || (isNote ? '#1e293b' : isDark ? '#ffffff' : '#000000');

  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        left: posX,
        top: posY,
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={text}
        rows={isNote ? undefined : 1}
        onChange={(e) => {
          setText(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => onCommit(text)}
        placeholder={isNote ? 'Type note...' : 'Type text...'}
        className={
          isNote
            ? 'resize-none border-none outline-none font-[\'Plus_Jakarta_Sans\'] bg-transparent leading-[1.35] p-0 m-0 overflow-y-auto'
            : 'resize-none border-2 border-indigo-500/80 dark:border-indigo-400 outline-none font-[\'Plus_Jakarta_Sans\'] bg-white/80 dark:bg-zinc-900/85 backdrop-blur-xs leading-[1.35] px-2.5 py-1 -mx-2.5 -my-1 rounded-lg shadow-sm whitespace-pre overflow-hidden'
        }
        style={{
          width: isNote ? `${noteInnerWidth}px` : undefined,
          minWidth: isNote ? `${noteInnerWidth}px` : '140px',
          height: isNote ? `${noteInnerHeight}px` : undefined,
          fontSize: `${scaledFontSize}px`,
          color: effectiveTextColor,
        }}
      />
    </div>
  );
};
