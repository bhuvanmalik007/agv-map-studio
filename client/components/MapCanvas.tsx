import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import {
  SCREEN_DIRECTION_VECTOR,
  createProjection,
  findDirectedEdges,
  projectNode,
  unprojectPoint,
} from '../../shared/mapMath';
import type { MapNode } from '../../shared/schema';

interface ViewState {
  zoom: number;
  rotation: number;
  panX: number;
  panY: number;
}

interface MapCanvasProps {
  maxNeighborDistance: number;
  nodes: MapNode[];
  onNodeChange: (index: number, node: MapNode) => void;
  onSelect: (index: number | null) => void;
  selectedIndex: number | null;
  view: ViewState;
  onViewChange: (view: ViewState) => void;
}

type PointerMode =
  | { kind: 'idle' }
  | { kind: 'node'; index: number }
  | { kind: 'pan'; clientX: number; clientY: number; panX: number; panY: number };

const WIDTH = 1000;
const HEIGHT = 700;

function shortenLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  amount = 14,
) {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const unitX = (to.x - from.x) / length;
  const unitY = (to.y - from.y) / length;
  return {
    x1: from.x + unitX * amount,
    y1: from.y + unitY * amount,
    x2: to.x - unitX * amount,
    y2: to.y - unitY * amount,
  };
}

export function MapCanvas({
  maxNeighborDistance,
  nodes,
  onNodeChange,
  onSelect,
  selectedIndex,
  view,
  onViewChange,
}: MapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<SVGGElement>(null);
  const pointerMode = useRef<PointerMode>({ kind: 'idle' });
  const [isInteracting, setIsInteracting] = useState(false);
  const projection = useMemo(() => createProjection(nodes, WIDTH, HEIGHT, 92), [nodes]);
  const points = useMemo(() => nodes.map((node) => projectNode(node, projection)), [nodes, projection]);
  const edges = useMemo(
    () => findDirectedEdges(nodes, maxNeighborDistance),
    [nodes, maxNeighborDistance],
  );

  const beginNodeDrag = (event: PointerEvent<SVGGElement>, index: number) => {
    event.stopPropagation();
    event.currentTarget.ownerSVGElement?.setPointerCapture?.(event.pointerId);
    pointerMode.current = { kind: 'node', index };
    setIsInteracting(true);
    onSelect(index);
  };

  const beginPan = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerMode.current = {
      kind: 'pan',
      clientX: event.clientX,
      clientY: event.clientY,
      panX: view.panX,
      panY: view.panY,
    };
    setIsInteracting(true);
    onSelect(null);
  };

  const movePointer = (event: PointerEvent<SVGSVGElement>) => {
    const mode = pointerMode.current;
    if (mode.kind === 'idle') return;

    if (mode.kind === 'pan') {
      const bounds = event.currentTarget.getBoundingClientRect();
      const unitX = WIDTH / Math.max(bounds.width, 1);
      const unitY = HEIGHT / Math.max(bounds.height, 1);
      onViewChange({
        ...view,
        panX: mode.panX + (event.clientX - mode.clientX) * unitX,
        panY: mode.panY + (event.clientY - mode.clientY) * unitY,
      });
      return;
    }

    const matrix = contentRef.current?.getScreenCTM();
    if (!matrix) return;
    const localPoint = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const domainPoint = unprojectPoint(localPoint, projection);
    onNodeChange(mode.index, {
      ...nodes[mode.index],
      x: domainPoint.x,
      y: domainPoint.y,
    });
  };

  const endPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    pointerMode.current = { kind: 'idle' };
    setIsInteracting(false);
  };

  const zoomWithWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    onViewChange({ ...view, zoom: Math.min(3, Math.max(0.45, view.zoom * factor)) });
  };

  const transform = `translate(${WIDTH / 2 + view.panX} ${HEIGHT / 2 + view.panY}) rotate(${view.rotation}) scale(${view.zoom}) translate(${-WIDTH / 2} ${-HEIGHT / 2})`;

  return (
    <div className="map-frame">
      <svg
        ref={svgRef}
        className={`map-canvas ${isInteracting ? 'is-interacting' : ''}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`AGV map with ${nodes.length} nodes and ${edges.length} directed connections`}
        onPointerDown={beginPan}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={zoomWithWheel}
      >
        <defs>
          <pattern id="minor-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(127, 150, 180, .08)" strokeWidth="1" />
          </pattern>
          <pattern id="major-grid" width="140" height="140" patternUnits="userSpaceOnUse">
            <rect width="140" height="140" fill="url(#minor-grid)" />
            <path d="M 140 0 L 0 0 0 140" fill="none" stroke="rgba(127, 150, 180, .12)" strokeWidth="1" />
          </pattern>
          <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,7 L6,3.5 z" fill="#6ea8a2" />
          </marker>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="#0b1220" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#major-grid)" />

        <g ref={contentRef} transform={transform}>
          <g className="map-edges">
            {edges.map((edge) => {
              const line = shortenLine(points[edge.from], points[edge.to]);
              return (
                <line
                  key={`${edge.from}-${edge.direction}`}
                  {...line}
                  markerEnd="url(#arrow)"
                />
              );
            })}
          </g>

          <g className="map-nodes">
            {nodes.map((node, index) => {
              const point = points[index];
              const selected = selectedIndex === index;
              const nodeKind = node.charger ? 'charger' : node.chute ? 'chute' : 'standard';
              return (
                <g
                  key={`${node.code}-${index}`}
                  className={`map-node map-node-${nodeKind} ${selected ? 'selected' : ''}`}
                  transform={`translate(${point.x} ${point.y})`}
                  onPointerDown={(event) => beginNodeDrag(event, index)}
                  onClick={() => onSelect(index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.name ?? 'Node'} QR ${node.code}, X ${node.x}, Y ${node.y}`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelect(index);
                  }}
                >
                  <circle className="node-hit-target" r="22" />
                  {selected && <circle className="selection-halo" r="22" filter="url(#node-glow)" />}
                  <circle className="node-disc" r="11" />
                  <circle className="node-center" r="3.5" />

                  {(node.directions ?? []).map((direction) => {
                    const vector = SCREEN_DIRECTION_VECTOR[direction];
                    return (
                      <line
                        key={direction}
                        className="direction-tick"
                        x1={vector.x * 12}
                        y1={vector.y * 12}
                        x2={vector.x * 18}
                        y2={vector.y * 18}
                      />
                    );
                  })}

                  {(node.charger || node.chute) && (
                    <text className="node-kind" x="0" y="4">{node.charger ? 'C' : 'H'}</text>
                  )}
                  {node.name && (
                    <text className="node-label" x="17" y="-14">{node.name}</text>
                  )}
                </g>
              );
            })}
          </g>
        </g>

        <g className="compass" transform="translate(918 88)">
          <circle r="42" />
          <path d="M0-29 5-11 0-15-5-11Z" />
          <text x="0" y="-20">N</text>
          <text x="26" y="4">E</text>
          <text x="0" y="31">S</text>
          <text x="-27" y="4">W</text>
        </g>
      </svg>

      <div className="canvas-hint">
        <span><i className="legend-dot standard" /> Node</span>
        <span><i className="legend-dot charger" /> Charger</span>
        <span><i className="legend-dot chute" /> Chute</span>
        <span className="drag-hint">Drag canvas to pan · Scroll to zoom · Drag nodes to move</span>
      </div>
    </div>
  );
}
