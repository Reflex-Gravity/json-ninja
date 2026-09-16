import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { PanelId, TabState } from '@/types';

export const TAB_DRAG_MIME = 'application/x-panel-tab';

export interface TabDragPayload {
  panelId: PanelId;
  tabId: string;
}

export function readTabDragPayload(e: React.DragEvent): TabDragPayload | null {
  const raw = e.dataTransfer.getData(TAB_DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TabDragPayload;
  } catch {
    return null;
  }
}

interface Props {
  panelId: PanelId;
  tabs: TabState[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onAdd: () => void;
  onClose: (tabId: string) => void;
  onTabDrop: (fromPanelId: PanelId, tabId: string, toIndex: number) => void;
}

export default function TabStrip({
  panelId,
  tabs,
  activeTabId,
  onSelect,
  onAdd,
  onClose,
  onTabDrop,
}: Props) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      TAB_DRAG_MIME,
      JSON.stringify({ panelId, tabId } satisfies TabDragPayload)
    );
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const payload = readTabDragPayload(e);
    if (!payload) return;
    onTabDrop(payload.panelId, payload.tabId, index);
  };

  return (
    <div
      className="flex items-center gap-0.5 px-1.5 pt-1.5 bg-gray-100 dark:bg-gray-700 overflow-x-auto"
      onDragOver={(e) => handleDragOver(e, tabs.length)}
      onDrop={(e) => handleDrop(e, tabs.length)}
      onDragLeave={() => setDragOverIndex(null)}
    >
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          draggable
          onDragStart={(e) => handleDragStart(e, tab.id)}
          onDragOver={(e) => {
            e.stopPropagation();
            handleDragOver(e, index);
          }}
          onDrop={(e) => {
            e.stopPropagation();
            handleDrop(e, index);
          }}
          onDragLeave={() => setDragOverIndex(null)}
          onClick={() => onSelect(tab.id)}
          title="Drag to reorder, or drop onto another panel to move it there"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-t-md text-xs font-medium cursor-pointer whitespace-nowrap transition-colors flex-shrink-0 ${
            dragOverIndex === index ? 'border-l-2 border-blue-500' : ''
          } ${
            tab.id === activeTabId
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span className="truncate max-w-[120px]">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
            title="Close tab"
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        title="New tab"
        className="flex items-center justify-center w-6 h-6 rounded text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
