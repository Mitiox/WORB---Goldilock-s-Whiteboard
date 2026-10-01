import {
  BoundingBox,
  Point,
  ResizeHandle,
  Viewport,
  WhiteboardElement,
} from '../types/whiteboard';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'el_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: Viewport
): Point {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: Viewport
): Point {
  return {
    x: canvasX * viewport.zoom + viewport.x,
    y: canvasY * viewport.zoom + viewport.y,
  };
}

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return distance(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y),
  });
}

export function getElementBoundingBox(element: WhiteboardElement): BoundingBox {
  switch (element.type) {
    case 'stroke': {
      if (!element.points || element.points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const pad = (element.size || 2) / 2;

      for (const p of element.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }

      minX -= pad;
      minY -= pad;
      maxX += pad;
      maxY += pad;

      return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(8, maxX - minX),
        height: Math.max(8, maxY - minY),
      };
    }
    case 'text': {
      return {
        minX: element.x,
        minY: element.y,
        maxX: element.x + element.width,
        maxY: element.y + element.height,
        width: element.width,
        height: element.height,
      };
    }
    case 'shape': {
      const minX = Math.min(element.x, element.x + element.width);
      const maxX = Math.max(element.x, element.x + element.width);
      const minY = Math.min(element.y, element.y + element.height);
      const maxY = Math.max(element.y, element.y + element.height);
      const pad = (element.strokeWidth || 2) / 2;
      return {
        minX: minX - pad,
        minY: minY - pad,
        maxX: maxX + pad,
        maxY: maxY + pad,
        width: Math.max(1, maxX - minX + pad * 2),
        height: Math.max(1, maxY - minY + pad * 2),
      };
    }
    case 'note': {
      return {
        minX: element.x,
        minY: element.y,
        maxX: element.x + element.width,
        maxY: element.y + element.height,
        width: element.width,
        height: element.height,
      };
    }
  }
}

export function getCombinedBoundingBox(elements: WhiteboardElement[]): BoundingBox | null {
  if (elements.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const box = getElementBoundingBox(el);
    if (box.minX < minX) minX = box.minX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  if (minX === Infinity) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function isPointInElement(
  point: Point,
  element: WhiteboardElement,
  tolerance: number = 8
): boolean {
  const box = getElementBoundingBox(element);
  // Quick rejection if outside expanded bbox
  if (
    point.x < box.minX - tolerance ||
    point.x > box.maxX + tolerance ||
    point.y < box.minY - tolerance ||
    point.y > box.maxY + tolerance
  ) {
    return false;
  }

  switch (element.type) {
    case 'stroke': {
      const radius = Math.max(element.size / 2, 4) + tolerance;
      if (element.points.length === 1) {
        return distance(point, element.points[0]) <= radius;
      }
      for (let i = 0; i < element.points.length - 1; i++) {
        if (distToSegment(point, element.points[i], element.points[i + 1]) <= radius) {
          return true;
        }
      }
      return false;
    }
    case 'text':
    case 'note': {
      return (
        point.x >= box.minX - tolerance &&
        point.x <= box.maxX + tolerance &&
        point.y >= box.minY - tolerance &&
        point.y <= box.maxY + tolerance
      );
    }
    case 'shape': {
      if (element.shapeType === 'line' || element.shapeType === 'arrow') {
        const start: Point = { x: element.x, y: element.y };
        const end: Point = { x: element.x + element.width, y: element.y + element.height };
        const radius = Math.max(element.strokeWidth / 2, 4) + tolerance;
        return distToSegment(point, start, end) <= radius;
      } else if (element.shapeType === 'circle') {
        const cx = element.x + element.width / 2;
        const cy = element.y + element.height / 2;
        const rx = Math.abs(element.width) / 2;
        const ry = Math.abs(element.height) / 2;
        if (rx === 0 || ry === 0) return false;
        // Normalized ellipse distance
        const norm = ((point.x - cx) ** 2) / ((rx + tolerance) ** 2) +
                     ((point.y - cy) ** 2) / ((ry + tolerance) ** 2);
        return norm <= 1.0;
      } else {
        // Rectangle
        return (
          point.x >= box.minX - tolerance &&
          point.x <= box.maxX + tolerance &&
          point.y >= box.minY - tolerance &&
          point.y <= box.maxY + tolerance
        );
      }
    }
  }
}

export function isElementInBox(element: WhiteboardElement, selectionBox: BoundingBox): boolean {
  const elBox = getElementBoundingBox(element);
  // Check overlap / intersection
  return !(
    elBox.maxX < selectionBox.minX ||
    elBox.minX > selectionBox.maxX ||
    elBox.maxY < selectionBox.minY ||
    elBox.minY > selectionBox.maxY
  );
}

export function moveElement(element: WhiteboardElement, dx: number, dy: number): WhiteboardElement {
  switch (element.type) {
    case 'stroke': {
      return {
        ...element,
        points: element.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      };
    }
    case 'text':
    case 'note':
    case 'shape': {
      return {
        ...element,
        x: element.x + dx,
        y: element.y + dy,
      };
    }
  }
}

export function resizeElement(
  element: WhiteboardElement,
  origBox: BoundingBox,
  handle: ResizeHandle,
  mouseDelta: Point
): WhiteboardElement {
  const { minX, minY, maxX, maxY, width: origW, height: origH } = origBox;
  if (origW <= 0 || origH <= 0) return element;

  let newMinX = minX;
  let newMinY = minY;
  let newMaxX = maxX;
  let newMaxY = maxY;

  if (handle.includes('w')) newMinX += mouseDelta.x;
  if (handle.includes('e')) newMaxX += mouseDelta.x;
  if (handle.includes('n')) newMinY += mouseDelta.y;
  if (handle.includes('s')) newMaxY += mouseDelta.y;

  // Prevent flipping / inversion to < 10px
  if (newMaxX - newMinX < 10) {
    if (handle.includes('w')) newMinX = newMaxX - 10;
    else newMaxX = newMinX + 10;
  }
  if (newMaxY - newMinY < 10) {
    if (handle.includes('n')) newMinY = newMaxY - 10;
    else newMaxY = newMinY + 10;
  }

  const scaleX = (newMaxX - newMinX) / origW;
  const scaleY = (newMaxY - newMinY) / origH;

  switch (element.type) {
    case 'stroke': {
      const newPoints = element.points.map((p) => ({
        x: newMinX + (p.x - minX) * scaleX,
        y: newMinY + (p.y - minY) * scaleY,
      }));
      return {
        ...element,
        points: newPoints,
      };
    }
    case 'text': {
      const newFontSize = Math.max(12, Math.round(element.fontSize * Math.min(scaleX, scaleY)));
      return {
        ...element,
        x: newMinX,
        y: newMinY,
        width: newMaxX - newMinX,
        height: newMaxY - newMinY,
        fontSize: newFontSize,
      };
    }
    case 'shape': {
      return {
        ...element,
        x: newMinX,
        y: newMinY,
        width: newMaxX - newMinX,
        height: newMaxY - newMinY,
      };
    }
    case 'note': {
      return {
        ...element,
        x: newMinX,
        y: newMinY,
        width: newMaxX - newMinX,
        height: newMaxY - newMinY,
      };
    }
  }
}

export function getHandlePositions(box: BoundingBox): Record<ResizeHandle, Point> {
  const midX = box.minX + box.width / 2;
  const midY = box.minY + box.height / 2;

  return {
    nw: { x: box.minX, y: box.minY },
    n: { x: midX, y: box.minY },
    ne: { x: box.maxX, y: box.minY },
    e: { x: box.maxX, y: midY },
    se: { x: box.maxX, y: box.maxY },
    s: { x: midX, y: box.maxY },
    sw: { x: box.minX, y: box.maxY },
    w: { x: box.minX, y: midY },
  };
}

export function getHandleAtPoint(
  point: Point,
  box: BoundingBox,
  handleRadius: number = 8
): ResizeHandle | null {
  const handles = getHandlePositions(box);
  const handleKeys: ResizeHandle[] = ['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'];

  for (const h of handleKeys) {
    const hp = handles[h];
    if (distance(point, hp) <= handleRadius) {
      return h;
    }
  }
  return null;
}
