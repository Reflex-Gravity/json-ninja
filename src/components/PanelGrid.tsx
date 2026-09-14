import { useState, useRef, useCallback } from 'react';
import type { LayoutType } from '@/types';
import Panel from './Panel';
import type { EditorMode, PanelId } from '@/types';

interface PanelConfig {
  id: PanelId;
  title: string;
  mode: EditorMode;
  content: string;
}

interface Props {
  layout: LayoutType;
  panels: PanelConfig[];
  theme: 'light' | 'dark';
  onModeChange: (id: PanelId, mode: EditorMode) => void;
  onContentChange: (id: PanelId, content: string) => void;
  onTitleChange: (id: PanelId, title: string) => void;
  onSave: (id: PanelId) => void;
  onCompare?: (id: PanelId) => void;
}

export default function PanelGrid({
  layout,
  panels,
  theme,
  onModeChange,
  onContentChange,
  onTitleChange,
  onSave,
  onCompare,
}: Props) {
  const [splitH, setSplitH] = useState(50);
  const [splitV, setSplitH2] = useState(50);
  const [splitRow1, setSplitRow1] = useState(50);
  const [splitRow2, setSplitRow2] = useState(50);

  const draggingRef = useRef<null | 'h' | 'v' | 'r1' | 'r2'>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(15, Math.min(85, x));
      const clampedY = Math.max(15, Math.min(85, y));
      switch (draggingRef.current) {
        case 'h':
          setSplitH(clampedX);
          break;
        case 'v':
          setSplitH2(clampedY);
          break;
        case 'r1':
          setSplitRow1(clampedX);
          break;
        case 'r2':
          setSplitRow2(clampedX);
          break;
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const startDrag = (type: 'h' | 'v' | 'r1' | 'r2') => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = type;
    document.body.style.cursor = type === 'v' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderPanel = (panel: PanelConfig, compareId?: PanelId) => (
    <Panel
      key={panel.id}
      panelId={panel.id}
      title={panel.title}
      mode={panel.mode}
      content={panel.content}
      theme={theme}
      onModeChange={(m) => onModeChange(panel.id, m)}
      onContentChange={(c) => onContentChange(panel.id, c)}
      onTitleChange={(t) => onTitleChange(panel.id, t)}
      onSave={() => onSave(panel.id)}
      onImportFile={() => {}}
      onExportFile={() => {}}
      onCompare={compareId !== undefined ? () => onCompare?.(panel.id) : undefined}
    />
  );

  if (layout === 'single') {
    return (
      <div ref={containerRef} className="flex h-full w-full p-2 gap-2">
        <div className="flex-1 min-h-0 min-w-0">{renderPanel(panels[0])}</div>
      </div>
    );
  }

  if (layout === 'horizontal') {
    return (
      <div ref={containerRef} className="flex h-full w-full p-2 gap-0">
        <div className="min-h-0 min-w-0" style={{ width: `${splitH}%` }}>
          {renderPanel(panels[0], 0)}
        </div>
        <Divider orientation="vertical" onStart={startDrag('h')} />
        <div className="flex-1 min-h-0 min-w-0">
          {renderPanel(panels[1], 1)}
        </div>
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div ref={containerRef} className="flex flex-col h-full w-full p-2 gap-0">
        <div className="min-h-0 min-w-0" style={{ height: `${splitV}%` }}>
          {renderPanel(panels[0], 0)}
        </div>
        <Divider orientation="horizontal" onStart={startDrag('v')} />
        <div className="flex-1 min-h-0 min-w-0">
          {renderPanel(panels[1], 1)}
        </div>
      </div>
    );
  }

  // grid (2x2)
  return (
    <div ref={containerRef} className="flex flex-col h-full w-full p-2 gap-0">
      <div className="flex min-h-0 min-w-0" style={{ height: `${splitV}%` }}>
        <div className="min-h-0 min-w-0" style={{ width: `${splitRow1}%` }}>
          {renderPanel(panels[0], 0)}
        </div>
        <Divider orientation="vertical" onStart={startDrag('r1')} />
        <div className="flex-1 min-h-0 min-w-0">
          {renderPanel(panels[1], 1)}
        </div>
      </div>
      <Divider orientation="horizontal" onStart={startDrag('v')} />
      <div className="flex flex-1 min-h-0 min-w-0">
        <div className="min-h-0 min-w-0" style={{ width: `${splitRow2}%` }}>
          {renderPanel(panels[2], 2)}
        </div>
        <Divider orientation="vertical" onStart={startDrag('r2')} />
        <div className="flex-1 min-h-0 min-w-0">
          {renderPanel(panels[3], 3)}
        </div>
      </div>
    </div>
  );
}

function Divider({
  orientation,
  onStart,
}: {
  orientation: 'vertical' | 'horizontal';
  onStart: (e: React.MouseEvent) => void;
}) {
  if (orientation === 'vertical') {
    return (
      <div
        onMouseDown={onStart}
        className="w-1.5 cursor-col-resize flex-shrink-0 hover:bg-blue-400/40 transition-colors group relative"
      >
        <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-400 transition-colors" />
      </div>
    );
  }
  return (
    <div
      onMouseDown={onStart}
      className="h-1.5 cursor-row-resize flex-shrink-0 hover:bg-blue-400/40 transition-colors group relative"
    >
      <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-400 transition-colors" />
    </div>
  );
}
