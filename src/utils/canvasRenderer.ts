import {
  BoundingBox,
  Point,
  ResizeHandle,
  Viewport,
  WhiteboardElement,
} from '../types/whiteboard';
import { getCombinedBoundingBox, getElementBoundingBox, getHandlePositions, getElementCenter } from './math';
import { AlignmentGuide } from './alignment';

export interface RenderOptions {
  elements: WhiteboardElement[];
  selectedIds: Set<string>;
  hoveredId: string | null;
  viewport: Viewport;
  isDark: boolean;
  gridType: 'dots' | 'grid' | 'none';
  currentDraft?: WhiteboardElement | null;
  selectionBox?: BoundingBox | null;
  alignmentGuides?: AlignmentGuide[];
  lassoPoints?: Point[] | null;
  editingId?: string | null;
}

export function renderWhiteboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: RenderOptions
) {
  const {
    elements,
    selectedIds,
    hoveredId,
    viewport,
    isDark,
    gridType,
    currentDraft,
    selectionBox,
    alignmentGuides,
    lassoPoints,
    editingId,
  } = options;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Draw Background
  const bgColor = isDark ? '#0f1117' : '#f8fafc';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Grid (if enabled)
  if (gridType !== 'none') {
    drawGrid(ctx, width, height, viewport, isDark, gridType);
  }

  // 3. Apply Viewport Transform
  ctx.save();
  ctx.translate(viewport.x, viewport.y);
  ctx.scale(viewport.zoom, viewport.zoom);

  // Visible viewport bounding box in canvas coordinates for frustum culling
  const cullMargin = 50 / viewport.zoom;
  const viewMinX = -viewport.x / viewport.zoom - cullMargin;
  const viewMinY = -viewport.y / viewport.zoom - cullMargin;
  const viewMaxX = (width - viewport.x) / viewport.zoom + cullMargin;
  const viewMaxY = (height - viewport.y) / viewport.zoom + cullMargin;

  // 4. Render all persistent elements sorted by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  for (const el of sortedElements) {
    if (editingId && el.id === editingId) {
      if (el.type === 'text') {
        // Skip rendering text on canvas while editing so it doesn't double-render
        continue;
      }
      if (el.type === 'note') {
        // Render note card background and fold, but skip rendering text
        renderNote(ctx, { ...el, text: '' }, isDark);
        continue;
      }
    }

    // Frustum culling: skip rendering if element is off-screen
    const box = getElementBoundingBox(el);
    if (
      box.maxX < viewMinX ||
      box.minX > viewMaxX ||
      box.maxY < viewMinY ||
      box.minY > viewMaxY
    ) {
      continue;
    }

    const isHovered = hoveredId === el.id && !selectedIds.has(el.id);
    renderElement(ctx, el, isDark, isHovered);
  }

  // 5. Render active draft (while drawing pen, line, shape, etc.)
  if (currentDraft) {
    renderElement(ctx, currentDraft, isDark, false, true);
  }

  // 6. Render Selection Outlines & Handles
  const selectedElements = elements.filter(
    (el) => selectedIds.has(el.id) && el.id !== editingId
  );
  if (selectedElements.length > 0) {
    renderSelectionUI(ctx, selectedElements, isDark, viewport.zoom);
  }

  // 7. Render Drag Selection Marquee (if user is dragging a selection box)
  if (selectionBox) {
    drawMarqueeBox(ctx, selectionBox, isDark, viewport.zoom);
  }

  // 8. Render Smart Alignment Guides (while moving objects)
  if (alignmentGuides && alignmentGuides.length > 0) {
    drawAlignmentGuides(ctx, alignmentGuides, isDark, viewport.zoom);
  }

  // 9. Render Lasso Selection Polygon (if user is drawing lasso)
  if (lassoPoints && lassoPoints.length > 1) {
    drawLasso(ctx, lassoPoints, isDark, viewport.zoom);
  }

  ctx.restore(); // Restore Viewport transform
  ctx.restore(); // Restore root canvas state
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
  isDark: boolean,
  gridType: 'dots' | 'grid'
) {
  ctx.save();
  const baseSpacing = 28;
  const scaledSpacing = baseSpacing * viewport.zoom;
  
  // Skip if too tiny or too dense
  if (scaledSpacing < 10) {
    ctx.restore();
    return;
  }

  const offsetX = viewport.x % scaledSpacing;
  const offsetY = viewport.y % scaledSpacing;

  if (gridType === 'dots') {
    const dotColor = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.22)';
    ctx.fillStyle = dotColor;
    const dotRadius = Math.max(1.2, Math.min(2.5, 1.4 * viewport.zoom));

    ctx.beginPath();
    for (let x = offsetX; x < width; x += scaledSpacing) {
      for (let y = offsetY; y < height; y += scaledSpacing) {
        ctx.moveTo(x + dotRadius, y);
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  } else if (gridType === 'grid') {
    const lineColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.14)';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = offsetX; x < width; x += scaledSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += scaledSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function renderElement(
  ctx: CanvasRenderingContext2D,
  el: WhiteboardElement,
  isDark: boolean,
  isHovered: boolean = false,
  isDraft: boolean = false
) {
  ctx.save();
  if (isDraft) {
    ctx.globalAlpha = 0.85;
  }

  if (el.rotation) {
    const center = getElementCenter(el);
    ctx.translate(center.x, center.y);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-center.x, -center.y);
  }

  // Hover subtle halo
  if (isHovered) {
    const box = getElementBoundingBox(el, false);
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(box.minX - 4, box.minY - 4, box.width + 8, box.height + 8);
    ctx.restore();
  }

  switch (el.type) {
    case 'stroke':
      renderStroke(ctx, el, isDark);
      break;
    case 'text':
      renderText(ctx, el, isDark);
      break;
    case 'shape':
      renderShape(ctx, el, isDark);
      break;
    case 'note':
      renderNote(ctx, el, isDark);
      break;
  }

  ctx.restore();
}

function renderStroke(
  ctx: CanvasRenderingContext2D,
  el: Extract<WhiteboardElement, { type: 'stroke' }>,
  _isDark: boolean
) {
  if (el.points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.lineWidth = el.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (el.isHighlighter) {
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = el.size * 2.2;
    ctx.lineCap = 'square';
  } else if (el.strokeStyle === 'dashed') {
    ctx.setLineDash([el.size * 2, el.size * 2]);
  } else if (el.strokeStyle === 'dotted') {
    ctx.setLineDash([el.size, el.size * 1.5]);
  }

  ctx.beginPath();
  if (el.points.length === 1) {
    ctx.arc(el.points[0].x, el.points[0].y, el.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = el.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  // Draw smooth spline through points
  ctx.moveTo(el.points[0].x, el.points[0].y);
  for (let i = 1; i < el.points.length - 1; i++) {
    const xc = (el.points[i].x + el.points[i + 1].x) / 2;
    const yc = (el.points[i].y + el.points[i + 1].y) / 2;
    ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
  }
  const lastIndex = el.points.length - 1;
  ctx.lineTo(el.points[lastIndex].x, el.points[lastIndex].y);
  ctx.stroke();

  ctx.restore();
}

function renderText(
  ctx: CanvasRenderingContext2D,
  el: Extract<WhiteboardElement, { type: 'text' }>,
  isDark: boolean
) {
  if (!el.text) return;
  ctx.save();
  ctx.font = `${el.fontSize}px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`;

  ctx.fillStyle = el.color || (isDark ? '#ffffff' : '#000000');
  ctx.textBaseline = 'top';

  const lines = el.text.split('\n');
  const lineHeight = el.fontSize * 1.35;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], el.x, el.y + i * lineHeight);
  }
  ctx.restore();
}

function renderShape(
  ctx: CanvasRenderingContext2D,
  el: Extract<WhiteboardElement, { type: 'shape' }>,
  _isDark: boolean
) {
  ctx.save();
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.fillStyle = el.fillColor || 'transparent';

  if (el.strokeStyle === 'dashed') {
    ctx.setLineDash([el.strokeWidth * 2.5, el.strokeWidth * 2]);
  } else if (el.strokeStyle === 'dotted') {
    ctx.setLineDash([el.strokeWidth, el.strokeWidth * 1.8]);
  }

  const { x, y, width, height } = el;

  if (el.shapeType === 'rectangle') {
    const radius = Math.min(8, Math.abs(width) / 4, Math.abs(height) / 4);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }
    if (el.fillColor && el.fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
  } else if (el.shapeType === 'circle') {
    ctx.beginPath();
    const rx = Math.abs(width) / 2;
    const ry = Math.abs(height) / 2;
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    if (el.fillColor && el.fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
  } else if (el.shapeType === 'line') {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
  } else if (el.shapeType === 'arrow') {
    const startX = x;
    const startY = y;
    const endX = x + width;
    const endY = y + height;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrow head
    const angle = Math.atan2(endY - startY, endX - startX);
    const headLen = Math.max(12, el.strokeWidth * 3.5);
    ctx.fillStyle = el.strokeColor;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLen * Math.cos(angle - Math.PI / 6),
      endY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - headLen * Math.cos(angle + Math.PI / 6),
      endY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function renderNote(
  ctx: CanvasRenderingContext2D,
  el: Extract<WhiteboardElement, { type: 'note' }>,
  _isDark: boolean
) {
  ctx.save();
  const { x, y, width, height, color, textColor, fontSize, text } = el;

  // Sticky Note paper with soft shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = color;
  const radius = 6;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.fill();

  // Reset shadow for text and inner details
  ctx.shadowColor = 'transparent';

  // Paper fold dog-ear in top right
  const foldSize = Math.min(16, width * 0.15, height * 0.15);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.beginPath();
  ctx.moveTo(x + width - foldSize, y);
  ctx.lineTo(x + width, y + foldSize);
  ctx.lineTo(x + width - foldSize, y + foldSize);
  ctx.closePath();
  ctx.fill();

  // Draw note text with wrapping
  ctx.fillStyle = textColor || '#1e293b';
  ctx.font = `${fontSize || 15}px 'Plus Jakarta Sans', sans-serif`;
  ctx.textBaseline = 'top';

  const padding = 14;
  const maxWidth = width - padding * 2;
  const lineHeight = (fontSize || 15) * 1.35;
  const words = text ? text.split(/\s+/) : [];
  let line = '';
  let lineY = y + padding;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x + padding, lineY);
      line = words[n] + ' ';
      lineY += lineHeight;
      if (lineY > y + height - padding) break; // Clip text inside note
    } else {
      line = testLine;
    }
  }
  if (lineY <= y + height - padding) {
    ctx.fillText(line.trim(), x + padding, lineY);
  }

  ctx.restore();
}

function renderSelectionUI(
  ctx: CanvasRenderingContext2D,
  selectedElements: WhiteboardElement[],
  isDark: boolean,
  zoom: number
) {
  const isSingle = selectedElements.length === 1;
  const singleElement = isSingle ? selectedElements[0] : null;
  const rotationDeg = singleElement ? (singleElement.rotation || 0) : 0;

  // For a single element, use its local unrotated bounding box and rotate the frame
  const box = isSingle
    ? getElementBoundingBox(singleElement!, false)
    : getCombinedBoundingBox(selectedElements);

  if (!box) return;

  const accentColor = isDark ? '#60a5fa' : '#2563eb';
  const handleBg = isDark ? '#1e293b' : '#ffffff';
  const handleBorder = accentColor;
  const pad = 6;

  const selBox: BoundingBox = {
    minX: box.minX - pad,
    minY: box.minY - pad,
    maxX: box.maxX + pad,
    maxY: box.maxY + pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };

  const midX = selBox.minX + selBox.width / 2;
  const midY = selBox.minY + selBox.height / 2;

  ctx.save();

  // If rotated, rotate the whole selection frame and handles around center
  if (rotationDeg) {
    ctx.translate(midX, midY);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.translate(-midX, -midY);
  }

  // 1. Dashed bounding border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([5 / zoom, 4 / zoom]);
  ctx.strokeRect(selBox.minX, selBox.minY, selBox.width, selBox.height);

  // 2. Corner and Edge handles
  const handles = getHandlePositions(selBox);
  const handleSize = 8 / zoom;
  const handleKeys: ResizeHandle[] = ['nw', 'ne', 'se', 'sw'];

  ctx.setLineDash([]);
  for (const h of handleKeys) {
    const pos = handles[h];
    ctx.fillStyle = handleBg;
    ctx.strokeStyle = handleBorder;
    ctx.lineWidth = 1.5 / zoom;

    ctx.beginPath();
    ctx.rect(
      pos.x - handleSize / 2,
      pos.y - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.fill();
    ctx.stroke();
  }

  // 3. Rotation Handle: connecting line from top-center + circular handle knob
  const rotHandleY = selBox.minY - 24 / zoom;
  ctx.beginPath();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5 / zoom;
  ctx.moveTo(midX, selBox.minY);
  ctx.lineTo(midX, rotHandleY);
  ctx.stroke();

  // Rotation Knob
  const rotRadius = 5.5 / zoom;
  ctx.beginPath();
  ctx.arc(midX, rotHandleY, rotRadius, 0, Math.PI * 2);
  ctx.fillStyle = handleBg;
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5 / zoom;
  ctx.stroke();

  // Rotation degree badge
  if (rotationDeg !== 0) {
    const degText = `${Math.round(rotationDeg)}°`;
    ctx.font = `600 ${Math.max(9, 10 / zoom)}px 'JetBrains Mono', monospace`;
    const textWidth = ctx.measureText(degText).width;
    const badgeW = textWidth + 8 / zoom;
    const badgeH = 15 / zoom;
    const badgeX = midX + 10 / zoom;
    const badgeY = rotHandleY - badgeH / 2;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3 / zoom);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(degText, badgeX + 4 / zoom, badgeY + badgeH / 2);
  }

  // 4. Selection badge if multi-element
  if (selectedElements.length > 1) {
    const badgeText = `${selectedElements.length} items`;
    ctx.font = `600 ${Math.max(10, 11 / zoom)}px 'JetBrains Mono', monospace`;
    const textWidth = ctx.measureText(badgeText).width;
    const badgeH = 18 / zoom;
    const badgeW = textWidth + 12 / zoom;
    const badgeX = selBox.minX;
    const badgeY = selBox.minY - badgeH - 4 / zoom;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3 / zoom);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + 6 / zoom, badgeY + badgeH / 2);
  }

  ctx.restore();
}

function drawMarqueeBox(
  ctx: CanvasRenderingContext2D,
  box: BoundingBox,
  isDark: boolean,
  zoom: number
) {
  ctx.save();
  const accent = isDark ? '#38bdf8' : '#0284c7';
  ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.1)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.2 / zoom;
  ctx.setLineDash([4 / zoom, 3 / zoom]);

  ctx.fillRect(box.minX, box.minY, box.width, box.height);
  ctx.strokeRect(box.minX, box.minY, box.width, box.height);
  ctx.restore();
}

function drawAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  guides: AlignmentGuide[],
  isDark: boolean,
  zoom: number
) {
  if (!guides || guides.length === 0) return;

  ctx.save();
  const guideColor = isDark ? '#f43f5e' : '#e11d48'; // Vibrant rose magenta
  ctx.strokeStyle = guideColor;
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 3 / zoom]);

  for (const g of guides) {
    ctx.beginPath();
    if (g.type === 'vertical') {
      ctx.moveTo(g.coordinate, g.start);
      ctx.lineTo(g.coordinate, g.end);
    } else {
      ctx.moveTo(g.start, g.coordinate);
      ctx.lineTo(g.end, g.coordinate);
    }
    ctx.stroke();

    // Draw endpoint diamond/circle markers
    ctx.fillStyle = guideColor;
    const r = 2.5 / zoom;
    if (g.type === 'vertical') {
      ctx.beginPath();
      ctx.arc(g.coordinate, g.start, r, 0, Math.PI * 2);
      ctx.arc(g.coordinate, g.end, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(g.start, g.coordinate, r, 0, Math.PI * 2);
      ctx.arc(g.end, g.coordinate, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawLasso(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  isDark: boolean,
  zoom: number
) {
  if (!points || points.length < 2) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();

  // Translucent fill
  ctx.fillStyle = isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.09)';
  ctx.fill();

  // Crisp dashed outline
  ctx.strokeStyle = isDark ? '#a5b4fc' : '#6366f1';
  ctx.lineWidth = 1.4 / zoom;
  ctx.setLineDash([4 / zoom, 3 / zoom]);
  ctx.stroke();

  ctx.restore();
}
