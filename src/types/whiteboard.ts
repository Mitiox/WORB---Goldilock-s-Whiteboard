export type ToolType = 
  | 'select' 
  | 'pen' 
  | 'highlighter' 
  | 'eraser' 
  | 'text' 
  | 'rectangle' 
  | 'circle' 
  | 'line' 
  | 'arrow' 
  | 'note' 
  | 'pan';

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  zIndex: number;
  opacity?: number;
}

export interface StrokeElement extends BaseElement {
  type: 'stroke';
  points: Point[];
  color: string;
  size: number;
  isHighlighter?: boolean;
  strokeStyle?: StrokeStyle;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily?: string;
  color: string;
  width: number;
  height: number;
  align?: 'left' | 'center' | 'right';
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  strokeStyle?: StrokeStyle;
}

export interface NoteElement extends BaseElement {
  type: 'note';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string; // Background color of sticky note
  textColor: string;
  fontSize: number;
}

export type WhiteboardElement = StrokeElement | TextElement | ShapeElement | NoteElement;

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
