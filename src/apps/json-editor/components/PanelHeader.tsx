import { useState, useRef, useLayoutEffect } from 'react';
import {
  MoreHorizontal,
  Table as TableIcon,
  GitBranch,
  GitCompare,
  Code2,
  Copy,
  Trash2,
  Download,
  Upload,
  Search,
  Save,
  Share2,
  Check,
  X,
} from 'lucide-react';
import type { EditorMode } from '@/types';
import { tryParseJson, byteSize } from '@/lib/json-utils';
import { showToast } from '@/lib/toast';
import { PANEL_TRANSFORMS } from '../panel-actions';

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
  onShare: () => void;
  onCompare?: () => void;
}

interface HeaderAction {
  id: string;
  label: string;
  icon: typeof Code2;
  // Actions in the same group sit together; a divider separates groups.
  group: number;
  onClick: () => void;
  danger?: boolean;
}

const modes: { mode: EditorMode; label: string; icon: typeof Code2 }[] = [
  { mode: 'tree', label: 'Tree', icon: GitBranch },
  { mode: 'code', label: 'Code', icon: Code2 },
  { mode: 'table', label: 'Table', icon: TableIcon },
];

// Pixel sizes of the header's building blocks, used to decide how many actions fit inline.
const BUTTON_WIDTH = 30;
const DIVIDER_WIDTH = 9;
const TITLE_MIN_WIDTH = 72;
const ROW_PADDING = 20;

function countFitting(actions: HeaderAction[], available: number): number {
  const widthOf = (count: number) =>
    actions
      .slice(0, count)
      .reduce(
        (sum, a, i) => sum + BUTTON_WIDTH + (i > 0 && a.group !== actions[i - 1].group ? DIVIDER_WIDTH : 0),
        0
      );
  if (widthOf(actions.length) <= available) return actions.length;
  let count = actions.length - 1;
  while (count > 0 && widthOf(count) + DIVIDER_WIDTH + BUTTON_WIDTH > available) count--;
  return count;
}

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
  onShare,
  onCompare,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const rowRef = useRef<HTMLDivElement>(null);
  const modesRef = useRef<HTMLDivElement>(null);

  const validation = tryParseJson(content);
  const size = byteSize(content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const saveTitle = () => {
    onTitleChange(tempTitle.trim() || title);
    setEditingTitle(false);
  };

  const actions: HeaderAction[] = [
    ...PANEL_TRANSFORMS.map(({ label, icon, apply }) => ({
      id: label,
      label,
      icon,
      group: 0,
      onClick: () => {
        try {
          onContentChange(apply(content));
        } catch (e) {
          showToast(`${label} failed: ${(e as Error).message}`, 'error');
        }
      },
    })),
    { id: 'copy', label: copied ? 'Copied!' : 'Copy', icon: copied ? Check : Copy, group: 1, onClick: handleCopy },
    { id: 'search', label: 'Search', icon: Search, group: 1, onClick: () => setSearchOpen(!searchOpen) },
    { id: 'save', label: 'Save to documents', icon: Save, group: 2, onClick: onSave },
    { id: 'import', label: 'Import file', icon: Upload, group: 2, onClick: onImportFile },
    { id: 'export', label: 'Export file', icon: Download, group: 2, onClick: onExportFile },
    { id: 'share', label: 'Copy share link', icon: Share2, group: 2, onClick: onShare },
    ...(onCompare
      ? [{ id: 'compare', label: 'Compare', icon: GitCompare, group: 3, onClick: onCompare }]
      : []),
    { id: 'clear', label: 'Clear', icon: Trash2, group: 3, onClick: () => onContentChange(''), danger: true },
  ];

  const [visibleCount, setVisibleCount] = useState(actions.length);

  // Show as many actions inline as the panel width allows; the rest go in the overflow menu.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const available =
        row.clientWidth - (modesRef.current?.offsetWidth ?? 0) - TITLE_MIN_WIDTH - ROW_PADDING;
      setVisibleCount(countFitting(actions, available));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    measure();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.length]);

  const inline = actions.slice(0, visibleCount);
  const overflow = actions.slice(visibleCount);

  return (
    <div className="relative flex flex-col border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 select-none">
      <div ref={rowRef} className="flex items-center gap-1 px-2 py-1.5 min-h-[40px]">
        {/* Mode switcher */}
        <div ref={modesRef} className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 flex-shrink-0">
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

        {/* Inline actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {inline.map(({ id, label, icon: Icon, group, onClick, danger }, i) => (
            <div key={id} className="flex items-center gap-0.5">
              {i > 0 && group !== inline[i - 1].group && (
                <div className="w-px h-4 mx-1 bg-gray-200 dark:bg-gray-700" />
              )}
              <button
                onClick={onClick}
                title={label}
                aria-label={label}
                className={`p-1.5 rounded transition-colors ${
                  danger
                    ? 'text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {overflow.length > 0 && (
            <>
              <div className="w-px h-4 mx-1 bg-gray-200 dark:bg-gray-700" />
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                title="More actions"
                className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </>
          )}
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

      {/* Overflow menu */}
      {menuOpen && overflow.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-9 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
            {overflow.map(({ id, label, icon, group, onClick, danger }, i) => (
              <div key={id}>
                {i > 0 && group !== overflow[i - 1].group && (
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                )}
                <MenuItem
                  icon={icon}
                  label={label}
                  danger={danger}
                  onClick={() => {
                    onClick();
                    setMenuOpen(false);
                  }}
                />
              </div>
            ))}
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
