import { DIRECTIONS, type Direction, type MapNode } from '../../shared/schema';
import { Icon } from './Icon';

interface NodeInspectorProps {
  duplicateCode: boolean;
  maxNeighborDistance: number;
  node: MapNode | null;
  onChange: (node: MapNode) => void;
  onMaxDistanceChange: (distance: number) => void;
}

function directionValue(value: string): Direction {
  return DIRECTIONS.includes(value as Direction) ? (value as Direction) : 'North';
}

export function NodeInspector({
  duplicateCode,
  maxNeighborDistance,
  node,
  onChange,
  onMaxDistanceChange,
}: NodeInspectorProps) {
  const updateNumber = (key: 'x' | 'y' | 'code', value: string) => {
    if (!node) return;
    onChange({ ...node, [key]: Number.parseInt(value, 10) || 0 });
  };

  const toggleDirection = (direction: Direction) => {
    if (!node) return;
    const directions = node.directions ?? [];
    const nextDirections = directions.includes(direction)
      ? directions.filter((item) => item !== direction)
      : [...directions, direction];
    onChange({ ...node, directions: nextDirections.length ? nextDirections : undefined });
  };

  const updateAccessory = (kind: 'charger' | 'chute', value: string) => {
    if (!node) return;
    onChange({
      ...node,
      [kind]: value === '' ? undefined : { direction: directionValue(value) },
    });
  };

  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <div>
          <p className="eyebrow">Inspector</p>
          <h2>{node ? node.name || `QR ${node.code}` : 'No node selected'}</h2>
        </div>
        {node && <span className="selection-dot" aria-label="Selected" />}
      </div>

      {node ? (
        <div className="inspector-form">
          <label className="field field-full">
            <span>Name <small>optional</small></span>
            <input
              value={node.name ?? ''}
              placeholder="e.g. STAGING"
              onChange={(event) =>
                onChange({ ...node, name: event.target.value.trimStart() || undefined })
              }
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>X <small>mm</small></span>
              <input type="number" step="1" value={node.x} onChange={(event) => updateNumber('x', event.target.value)} />
            </label>
            <label className="field">
              <span>Y <small>mm</small></span>
              <input type="number" step="1" value={node.y} onChange={(event) => updateNumber('y', event.target.value)} />
            </label>
          </div>

          <label className="field field-full">
            <span>QR code</span>
            <input
              className={duplicateCode ? 'input-error' : ''}
              type="number"
              min="0"
              step="1"
              value={node.code}
              onChange={(event) => updateNumber('code', event.target.value)}
            />
            {duplicateCode && (
              <span className="field-warning"><Icon name="warning" /> This QR code is already in use.</span>
            )}
          </label>

          <fieldset className="field-set">
            <legend>Allowed travel directions</legend>
            <div className="direction-grid">
              {DIRECTIONS.map((direction) => (
                <label key={direction} className="direction-option">
                  <input
                    type="checkbox"
                    checked={node.directions?.includes(direction) ?? false}
                    onChange={() => toggleDirection(direction)}
                  />
                  <span className={`direction-arrow direction-${direction.toLowerCase()}`}>↑</span>
                  {direction}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field field-full">
            <span>Charger plug direction <small>optional</small></span>
            <select value={node.charger?.direction ?? ''} onChange={(event) => updateAccessory('charger', event.target.value)}>
              <option value="">No charger</option>
              {DIRECTIONS.map((direction) => <option key={direction}>{direction}</option>)}
            </select>
            <small className="field-help">The AGV backs in from the opposite direction.</small>
          </label>

          <label className="field field-full">
            <span>Chute direction <small>optional</small></span>
            <select value={node.chute?.direction ?? ''} onChange={(event) => updateAccessory('chute', event.target.value)}>
              <option value="">No chute</option>
              {DIRECTIONS.map((direction) => <option key={direction}>{direction}</option>)}
            </select>
          </label>
        </div>
      ) : (
        <div className="inspector-empty">
          <div className="empty-node">+</div>
          <p>Select a node on the map to inspect and edit its properties.</p>
          <p className="muted">Tip: drag any node to update its millimeter coordinates.</p>
        </div>
      )}

      <div className="map-settings">
        <p className="eyebrow">Map settings</p>
        <label className="field field-full">
          <span>Maximum neighbor distance <small>mm</small></span>
          <input
            type="number"
            min="1"
            step="1"
            value={maxNeighborDistance}
            onChange={(event) => onMaxDistanceChange(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
          />
          <small className="field-help">Directional links farther than this are not connected.</small>
        </label>
      </div>
    </aside>
  );
}
