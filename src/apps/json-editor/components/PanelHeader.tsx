import { useState } from 'react';
import {
  AlignLeft,
  Table as TableIcon,
  GitBranch,
  Code2,
  Minimize2,
  Braces,
  Wrench,
  Copy,
  Trash2,
  Download,
  Upload,
  Search,
  FileText,
  Save,
  Check,
  X,
} from 'lucide-react';
import type { EditorMode } from '@/types';
import { formatJson, compactJson, sortJsonKeys, repairJson, tryParseJson, byteSize } from '@/lib/json-utils';

interface Props {
  title: string;
  mode: EditorMode;
  content: string;
  onModeChange: (mode: EditorMode) => void;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onImportFile: () => void;
  onExportFile: () => void;
  onCompare?: () => void;
}

const modes: { mode: EditorMode; label: string; icon: typeof Code2 }[] = [
  { mode: 'tree', label: 'Tree', icon: GitBranch },
  { mode: 'code', label: 'Code', icon: Code2 },
  { mode: 'table', label: 'Table', icon: TableIcon },
];

export default function PanelHeader({
  title,
  mode,
  content,
  onModeChange,
  onContentChange,
  onTitleChange,
  onSave,
  onImportFile,
  onExportFile,
  onCompare,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const validation = tryParseJson(content);
  const size = byteSize(content);

  const handleAction = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
    setMenuOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
    setMenuOpen(false);
  };

  const handleClear = () => {
    onContentChange('');
    setMenuOpen(false);
  };

  const saveTitle = () => {
    onTitleChange(tempTitle.trim() || title);
    setEditingTitle(false);
  };

  return (
    <div className="relative flex flex-col border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 select-none">
      <div className="flex items-center gap-1 px-2 py-1.5 min-h-[40px]">
        {/* Mode switcher */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
          {modes.map(({ mode: m, label, icon: Icon }) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              title={label}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Title */}
        <div className="flex-1 flex items-center min-w-0 px-2">
          {editingTitle ? (
            <div className="flex items-center gap-1 w-full">
              <input
                autoFocus
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-1.5 py-0.5 outline-none flex-1 min-w-0"
              />
              <button onClick={saveTitle} className="text-green-600 hover:text-green-700">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempTitle(title);
                setEditingTitle(true);
              }}
              className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 truncate"
              title="Click to rename"
            >
              {title}
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            title="Search"
            className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onSave}
            title="Save to documents"
            className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={onImportFile}
            title="Import file"
            className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={onExportFile}
            title="Export file"
            className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            title="More actions"
            className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-2 py-1 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in document..."
            className="text-xs bg-transparent flex-1 outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchOpen(false);
                setSearchTerm('');
              }
            }}
          />
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchTerm('');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-9 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
            <MenuItem icon={Braces} label="Format" onClick={() => handleAction(() => onContentChange(formatJson(content)))} />
            <MenuItem icon={Minimize2} label="Compact" onClick={() => handleAction(() => onContentChange(compactJson(content)))} />
            <MenuItem icon={AlignLeft} label="Sort keys" onClick={() => handleAction(() => onContentChange(sortJsonKeys(content)))} />
            <MenuItem icon={Wrench} label="Repair JSON" onClick={() => handleAction(() => onContentChange(repairJson(content)))} />
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <MenuItem icon={copied ? Check : Copy} label={copied ? 'Copied!' : 'Copy'} onClick={handleCopy} />
            {onCompare && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <MenuItem icon={FileText} label="Compare" onClick={() => { onCompare(); setMenuOpen(false); }} />
              </>
            )}
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <MenuItem icon={Trash2} label="Clear" onClick={handleClear} danger />
          </div>
        </>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-3 px-2 py-0.5 text-[10px] bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
        <span>{size}</span>
        {validation.ok ? (
          <span className="text-green-600 dark:text-green-400">Valid JSON</span>
        ) : (
          <span className="text-red-500 dark:text-red-400 truncate" title={validation.error}>
            {validation.error}
          </span>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Code2;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
