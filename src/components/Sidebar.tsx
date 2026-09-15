import type { ToolId } from '@/types';
import { TOOLS } from '@/lib/tools';

interface Props {
  activeTool: ToolId;
  onChange: (tool: ToolId) => void;
}

export default function Sidebar({ activeTool, onChange }: Props) {
  return (
    <nav className="flex flex-col items-center gap-1 w-14 py-3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={label}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            activeTool === id
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </nav>
  );
}
