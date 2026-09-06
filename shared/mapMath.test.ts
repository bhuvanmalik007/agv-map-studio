import { describe, expect, it } from 'vitest';
import { createProjection, findDirectedEdges, projectNode, unprojectPoint } from './mapMath';
import type { MapNode } from './schema';

describe('findDirectedEdges', () => {
  it('uses the assignment coordinate convention in all four directions', () => {
    const nodes: MapNode[] = [
      { x: 0, y: 0, code: 1, directions: ['North', 'East', 'South', 'West'] },
      { x: 100, y: 0, code: 2 },
      { x: 0, y: -100, code: 3 },
      { x: -100, y: 0, code: 4 },
      { x: 0, y: 100, code: 5 },
      { x: 50, y: 50, code: 6 },
    ];

    expect(findDirectedEdges(nodes, 100)).toEqual([
      { from: 0, to: 1, direction: 'North' },
      { from: 0, to: 2, direction: 'East' },
      { from: 0, to: 3, direction: 'South' },
      { from: 0, to: 4, direction: 'West' },
    ]);
  });

  it('selects the nearest aligned node and includes the distance boundary', () => {
    const nodes: MapNode[] = [
      { x: 0, y: 0, code: 1, directions: ['North'] },
      { x: 100, y: 0, code: 2 },
      { x: 60, y: 0, code: 3 },
    ];

    expect(findDirectedEdges(nodes, 60)).toEqual([
      { from: 0, to: 2, direction: 'North' },
    ]);
    expect(findDirectedEdges(nodes, 59)).toEqual([]);
  });

  it('does not connect diagonal nodes even when they are nearby', () => {
    const nodes: MapNode[] = [
      { x: 0, y: 0, code: 1, directions: ['North', 'West'] },
      { x: 10, y: 10, code: 2 },
    ];
    expect(findDirectedEdges(nodes, 100)).toEqual([]);
  });
});

describe('map projection', () => {
  it('round-trips integer coordinates', () => {
    const nodes: MapNode[] = [
      { x: 1000, y: 2000, code: 1 },
      { x: 3000, y: 5000, code: 2 },
    ];
    const projection = createProjection(nodes);
    const projected = projectNode(nodes[1], projection);
    expect(unprojectPoint(projected, projection)).toEqual({ x: 3000, y: 5000 });
  });

  it('renders North upward and West to the left', () => {
    const center: MapNode = { x: 0, y: 0, code: 1 };
    const north: MapNode = { x: 100, y: 0, code: 2 };
    const west: MapNode = { x: 0, y: 100, code: 3 };
    const projection = createProjection([center, north, west]);

    expect(projectNode(north, projection).y).toBeLessThan(projectNode(center, projection).y);
    expect(projectNode(west, projection).x).toBeLessThan(projectNode(center, projection).x);
  });
});
