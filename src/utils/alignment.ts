import { BoundingBox, WhiteboardElement } from '../types/whiteboard';
import { getCombinedBoundingBox, getElementBoundingBox } from './math';

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  coordinate: number; // Y for horizontal line, X for vertical line
  start: number;
  end: number;
}

export interface SnapResult {
  snappedDx: number;
  snappedDy: number;
  guides: AlignmentGuide[];
}

/**
 * High-performance snapping using pre-calculated bounding boxes (zero allocations in hot loop)
 */
export function calculateAlignmentSnapWithBoxes(
  selBox: BoundingBox,
  otherBoxes: BoundingBox[],
  rawDx: number,
  rawDy: number,
  threshold: number = 6
): SnapResult {
  if (otherBoxes.length === 0) {
    return { snappedDx: rawDx, snappedDy: rawDy, guides: [] };
  }

  const dragLeft = selBox.minX + rawDx;
  const dragRight = selBox.maxX + rawDx;
  const dragCenterX = (dragLeft + dragRight) / 2;

  const dragTop = selBox.minY + rawDy;
  const dragBottom = selBox.maxY + rawDy;
  const dragCenterY = (dragTop + dragBottom) / 2;

  let bestDiffX = Infinity;
  let snappedDx = rawDx;
  let verticalGuide: AlignmentGuide | null = null;

  let bestDiffY = Infinity;
  let snappedDy = rawDy;
  let horizontalGuide: AlignmentGuide | null = null;

  for (let i = 0; i < otherBoxes.length; i++) {
    const other = otherBoxes[i];
    const oLeft = other.minX;
    const oRight = other.maxX;
    const oCenterX = (oLeft + oRight) / 2;

    const oTop = other.minY;
    const oBottom = other.maxY;
    const oCenterY = (oTop + oBottom) / 2;

    // --- Vertical Alignments (X coordinates match) ---
    const xPairs = [
      { drag: dragLeft, target: oLeft, offset: oLeft - selBox.minX },
      { drag: dragLeft, target: oRight, offset: oRight - selBox.minX },
      { drag: dragRight, target: oLeft, offset: oLeft - selBox.maxX },
      { drag: dragRight, target: oRight, offset: oRight - selBox.maxX },
      { drag: dragCenterX, target: oCenterX, offset: oCenterX - (selBox.minX + selBox.maxX) / 2 },
    ];

    for (let j = 0; j < xPairs.length; j++) {
      const pair = xPairs[j];
      const diff = Math.abs(pair.drag - pair.target);
      if (diff <= threshold && diff < bestDiffX) {
        bestDiffX = diff;
        snappedDx = pair.offset;
        const minY = Math.min(dragTop, oTop) - 20;
        const maxY = Math.max(dragBottom, oBottom) + 20;
        verticalGuide = {
          type: 'vertical',
          coordinate: pair.target,
          start: minY,
          end: maxY,
        };
      }
    }

    // --- Horizontal Alignments (Y coordinates match) ---
    const yPairs = [
      { drag: dragTop, target: oTop, offset: oTop - selBox.minY },
      { drag: dragTop, target: oBottom, offset: oBottom - selBox.minY },
      { drag: dragBottom, target: oTop, offset: oTop - selBox.maxY },
      { drag: dragBottom, target: oBottom, offset: oBottom - selBox.maxY },
      { drag: dragCenterY, target: oCenterY, offset: oCenterY - (selBox.minY + selBox.maxY) / 2 },
    ];

    for (let j = 0; j < yPairs.length; j++) {
      const pair = yPairs[j];
      const diff = Math.abs(pair.drag - pair.target);
      if (diff <= threshold && diff < bestDiffY) {
        bestDiffY = diff;
        snappedDy = pair.offset;
        const minX = Math.min(dragLeft, oLeft) - 20;
        const maxX = Math.max(dragRight, oRight) + 20;
        horizontalGuide = {
          type: 'horizontal',
          coordinate: pair.target,
          start: minX,
          end: maxX,
        };
      }
    }
  }

  const guides: AlignmentGuide[] = [];
  if (verticalGuide) guides.push(verticalGuide);
  if (horizontalGuide) guides.push(horizontalGuide);

  return { snappedDx, snappedDy, guides };
}

/**
 * Calculates smart snapping guides and offsets when moving selected elements
 */
export function calculateAlignmentSnap(
  selectedElements: WhiteboardElement[],
  allElements: WhiteboardElement[],
  rawDx: number,
  rawDy: number,
  threshold: number = 6
): SnapResult {
  const selBox = getCombinedBoundingBox(selectedElements);
  if (!selBox) {
    return { snappedDx: rawDx, snappedDy: rawDy, guides: [] };
  }

  const selectedIds = new Set(selectedElements.map((e) => e.id));
  const unselectedElements = allElements.filter((e) => !selectedIds.has(e.id));

  if (unselectedElements.length === 0) {
    return { snappedDx: rawDx, snappedDy: rawDy, guides: [] };
  }

  const otherBoxes = unselectedElements.map((el) => getElementBoundingBox(el));
  return calculateAlignmentSnapWithBoxes(selBox, otherBoxes, rawDx, rawDy, threshold);
}
