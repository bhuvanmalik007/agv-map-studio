import { useEffect, useMemo, useRef, useState } from 'react';
import { mapDocumentSchema, type MapDocument, type MapNode } from '../shared/schema';
import { Icon } from './components/Icon';
import { MapCanvas } from './components/MapCanvas';
import { NodeInspector } from './components/NodeInspector';
import { Toolbar } from './components/Toolbar';
import { useMapQuery, useSaveMapMutation } from './queries/map';

const INITIAL_VIEW = { zoom: 1, rotation: 0, panX: 0, panY: 0 };

type Notice = { tone: 'success' | 'error'; message: string } | null;

export function App() {
  const mapQuery = useMapQuery();
  const saveMutation = useSaveMapMutation();
  const [mapDocument, setMapDocument] = useState<MapDocument | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const [notice, setNotice] = useState<Notice>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Hydrate the local editable draft once. Later background cache updates must
    // not overwrite changes that the user has not saved yet.
    if (mapQuery.data && !mapDocument) setMapDocument(mapQuery.data);
  }, [mapDocument, mapQuery.data]);

  const dirty = Boolean(
    mapDocument && mapQuery.data && JSON.stringify(mapDocument) !== JSON.stringify(mapQuery.data),
  );
  const selectedNode =
    mapDocument && selectedIndex !== null ? mapDocument.map.nodes[selectedIndex] ?? null : null;
  const duplicateCode = useMemo(() => {
    if (!mapDocument || selectedIndex === null || !selectedNode) return false;
    return mapDocument.map.nodes.some(
      (node, index) => index !== selectedIndex && node.code === selectedNode.code,
    );
  }, [mapDocument, selectedIndex, selectedNode]);

  const updateNode = (index: number, node: MapNode) => {
    setMapDocument((current) => {
      if (!current) return current;
      const nodes = [...current.map.nodes];
      nodes[index] = node;
      return { map: { ...current.map, nodes } };
    });
  };

  const handleSave = async () => {
    if (!mapDocument || duplicateCode) return;
    setNotice(null);
    try {
      const saved = await saveMutation.mutateAsync(mapDocument);
      setMapDocument(saved);
      setNotice({ tone: 'success', message: 'Map saved to the server.' });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Could not save the map.' });
    }
  };

  const addNode = () => {
    if (!mapDocument) return;
    const nodes = mapDocument.map.nodes;
    const x = nodes.length ? Math.round(nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length) : 0;
    const y = nodes.length ? Math.round(nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length) : 0;
    const code = Math.max(0, ...nodes.map((node) => node.code)) + 10;
    const nextNode: MapNode = { x, y, code };
    setMapDocument({ map: { ...mapDocument.map, nodes: [...nodes, nextNode] } });
    setSelectedIndex(nodes.length);
  };

  const deleteNode = () => {
    if (!mapDocument || selectedIndex === null) return;
    const nodes = mapDocument.map.nodes.filter((_, index) => index !== selectedIndex);
    setMapDocument({ map: { ...mapDocument.map, nodes } });
    setSelectedIndex(null);
  };

  const importMap = async (file: File) => {
    setNotice(null);
    try {
      const parsed = mapDocumentSchema.parse(JSON.parse(await file.text()));
      setMapDocument(parsed);
      setSelectedIndex(null);
      setView(INITIAL_VIEW);
      setNotice({ tone: 'success', message: `${file.name} imported. Save to persist it.` });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'That file is not a valid map.' });
    }
  };

  const exportMap = () => {
    if (!mapDocument) return;
    const blob = new Blob([`${JSON.stringify(mapDocument, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'agv-map.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (mapQuery.isPending) {
    return (
      <main className="app-state" aria-live="polite">
        <div className="loader" />
        <h1>Preparing the map editor</h1>
        <p>Loading and validating the current AGV map…</p>
      </main>
    );
  }

  if (mapQuery.isError || !mapDocument) {
    return (
      <main className="app-state">
        <div className="error-symbol"><Icon name="warning" /></div>
        <h1>We couldn’t open the map</h1>
        <p>{mapQuery.error?.message ?? 'The map response was empty.'}</p>
        <button className="button button-primary" onClick={() => void mapQuery.refetch()}>Try again</button>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <p className="eyebrow">Mujin tools</p>
          <h1>AGV Map Studio</h1>
        </div>
        <div className="map-summary" aria-label="Map summary">
          <span><strong>{mapDocument.map.nodes.length}</strong> nodes</span>
          <span><strong>{mapDocument.map.maxNeighborDistance.toLocaleString()}</strong> mm reach</span>
        </div>
      </header>

      <Toolbar
        dirty={dirty}
        fileInputRef={fileInputRef}
        onAdd={addNode}
        onDelete={deleteNode}
        onExport={exportMap}
        onImport={(file) => void importMap(file)}
        onSave={() => void handleSave()}
        onZoomIn={() => setView((current) => ({ ...current, zoom: Math.min(3, current.zoom * 1.2) }))}
        onZoomOut={() => setView((current) => ({ ...current, zoom: Math.max(0.45, current.zoom / 1.2) }))}
        onRotateLeft={() => setView((current) => ({ ...current, rotation: current.rotation - 90 }))}
        onRotateRight={() => setView((current) => ({ ...current, rotation: current.rotation + 90 }))}
        onResetView={() => setView(INITIAL_VIEW)}
        saveDisabled={!dirty || saveMutation.isPending || duplicateCode}
        selected={selectedIndex !== null}
      />

      {notice && (
        <div className={`notice notice-${notice.tone}`} role="status">
          <Icon name={notice.tone === 'success' ? 'check' : 'warning'} />
          <span>{notice.message}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <main className="workspace">
        <section className="canvas-panel" aria-label="Map editor canvas">
          <div className="canvas-heading">
            <div>
              <p className="eyebrow">Facility map</p>
              <h2>Navigation network</h2>
            </div>
            <div className="view-readout">
              <span>{Math.round(view.zoom * 100)}%</span>
              <span>{((view.rotation % 360) + 360) % 360}°</span>
            </div>
          </div>
          <MapCanvas
            maxNeighborDistance={mapDocument.map.maxNeighborDistance}
            nodes={mapDocument.map.nodes}
            onNodeChange={updateNode}
            onSelect={setSelectedIndex}
            selectedIndex={selectedIndex}
            view={view}
            onViewChange={setView}
          />
        </section>

        <NodeInspector
          duplicateCode={duplicateCode}
          maxNeighborDistance={mapDocument.map.maxNeighborDistance}
          node={selectedNode}
          onChange={(node) => selectedIndex !== null && updateNode(selectedIndex, node)}
          onMaxDistanceChange={(maxNeighborDistance) =>
            setMapDocument((current) =>
              current ? { map: { ...current.map, maxNeighborDistance } } : current,
            )
          }
        />
      </main>
    </div>
  );
}
