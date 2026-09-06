import type { RefObject } from 'react';
import { Icon } from './Icon';

interface ToolbarProps {
  dirty: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAdd: () => void;
  onDelete: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onResetView: () => void;
  saveDisabled: boolean;
  selected: boolean;
}

export function Toolbar({
  dirty,
  fileInputRef,
  onAdd,
  onDelete,
  onExport,
  onImport,
  onSave,
  onZoomIn,
  onZoomOut,
  onRotateLeft,
  onRotateRight,
  onResetView,
  saveDisabled,
  selected,
}: ToolbarProps) {
  return (
    <div className="toolbar" aria-label="Map tools">
      <div className="tool-group">
        <button className="button button-primary" onClick={onSave} disabled={saveDisabled}>
          <Icon name={dirty ? 'save' : 'check'} />
          {dirty ? 'Save map' : 'Saved'}
        </button>
        <button className="button" onClick={onAdd}>
          <Icon name="add" /> Add node
        </button>
        <button className="button button-danger" onClick={onDelete} disabled={!selected}>
          <Icon name="trash" /> Delete
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="tool-group">
        <button className="icon-button" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
          <Icon name="minus" />
        </button>
        <button className="icon-button" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
          <Icon name="zoomIn" />
        </button>
        <button className="icon-button" onClick={onRotateLeft} aria-label="Rotate left" title="Rotate left">
          <Icon name="undo" />
        </button>
        <button className="icon-button" onClick={onRotateRight} aria-label="Rotate right" title="Rotate right">
          <Icon name="redo" />
        </button>
        <button className="icon-button" onClick={onResetView} aria-label="Reset view" title="Reset view">
          <Icon name="reset" />
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="tool-group">
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = '';
          }}
        />
        <button className="button button-quiet" onClick={() => fileInputRef.current?.click()}>
          <Icon name="upload" /> Import
        </button>
        <button className="button button-quiet" onClick={onExport}>
          <Icon name="download" /> Export
        </button>
      </div>
    </div>
  );
}
