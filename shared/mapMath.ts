import type { Direction, MapNode } from './schema.js';

export interface MapEdge {
  from: number;
  to: number;
  direction: Direction;
}

export interface MapProjection {
  maxX: number;
  maxY: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

const TRAVEL_TESTS: Record<
  Direction,
  (source: MapNode, candidate: MapNode) => boolean
> = {
  North: (source, candidate) =>
    candidate.y === source.y && candidate.x > source.x,
  South: (source, candidate) =>
    candidate.y === source.y && candidate.x < source.x,
  West: (source, candidate) =>
    candidate.x === source.x && candidate.y > source.y,
  East: (source, candidate) =>
    candidate.x === source.x && candidate.y < source.y,
};

/**
 * Directions in this domain are intentionally unusual: North is +X and West
 * is +Y. A direction links to the nearest aligned node, provided it is no
 * farther away than maxNeighborDistance.
 */
export function findDirectedEdges(
  nodes: MapNode[],
  maxNeighborDistance: number,
): MapEdge[] {
  return nodes.flatMap((source, from) =>
    (source.directions ?? []).flatMap((direction) => {
      const nearest = nodes
        .map((candidate, to) => ({
          candidate,
          to,
          distance:
            Math.abs(candidate.x - source.x) +
            Math.abs(candidate.y - source.y),
        }))
        .filter(
          ({ candidate, to, distance }) =>
            to !== from &&
            TRAVEL_TESTS[direction](source, candidate) &&
            distance <= maxNeighborDistance,
        )
        .sort((a, b) => a.distance - b.distance)[0];

      return nearest ? [{ from, to: nearest.to, direction }] : [];
    }),
  );
}

export function createProjection(
  nodes: MapNode[],
  width = 1000,
  height = 700,
  padding = 70,
): MapProjection {
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  const scale = Math.min(
    (width - padding * 2) / yRange,
    (height - padding * 2) / xRange,
  );

  const drawingWidth = yRange * scale;
  const drawingHeight = xRange * scale;

  return {
    maxX,
    maxY,
    scale,
    offsetX: (width - drawingWidth) / 2,
    offsetY: (height - drawingHeight) / 2,
  };
}

/** Project domain coordinates so North (+X) is up and West (+Y) is left. */
export function projectNode(node: Pick<MapNode, 'x' | 'y'>, view: MapProjection): Point {
  return {
    x: view.offsetX + (view.maxY - node.y) * view.scale,
    y: view.offsetY + (view.maxX - node.x) * view.scale,
  };
}

export function unprojectPoint(point: Point, view: MapProjection): Point {
  return {
    x: Math.round(view.maxX - (point.y - view.offsetY) / view.scale),
    y: Math.round(view.maxY - (point.x - view.offsetX) / view.scale),
  };
}

export const SCREEN_DIRECTION_VECTOR: Record<Direction, Point> = {
  North: { x: 0, y: -1 },
  East: { x: 1, y: 0 },
  South: { x: 0, y: 1 },
  West: { x: -1, y: 0 },
};
