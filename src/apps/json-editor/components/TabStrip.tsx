import { Plus, X } from 'lucide-react';
import type { TabState } from '@/types';

interface Props {
  tabs: TabState[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onAdd: () => void;
  onClose: (tabId: string) => void;
}

export default function TabStrip({ tabs, activeTabId, onSelect, onAdd, onClose }: Props) {
  return (
    <div className="flex items-center gap-0.5 px-1.5 pt-1.5 bg-gray-100 dark:bg-gray-700 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-t-md text-xs font-medium cursor-pointer whitespace-nowrap transition-colors flex-shrink-0 ${
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
