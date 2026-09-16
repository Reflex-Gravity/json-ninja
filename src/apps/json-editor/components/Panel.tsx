import { useRef } from 'react';
import { PanelId, EditorMode, TabState } from '@/types';
import JSONEditorWrapper from './JSONEditorWrapper';
import PanelHeader from './PanelHeader';
import TabStrip from './TabStrip';

interface Props {
  panelId: PanelId;
  tabs: TabState[];
  activeTabId: string;
  title: string;
  mode: EditorMode;
  content: string;
  theme: 'light' | 'dark';
  onModeChange: (mode: EditorMode) => void;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onTabSelect: (tabId: string) => void;
  onTabAdd: () => void;
  onTabClose: (tabId: string) => void;
  onTabDrop: (fromPanelId: PanelId, tabId: string, toIndex: number) => void;
  onSave: () => void;
  onImportFile: () => void;
  onExportFile: () => void;
  onCompare?: () => void;
}

export default function Panel(props: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      props.onContentChange(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportFile = () => {
    const blob = new Blob([props.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.title.replace(/\s+/g, '-').toLowerCase() || 'document'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <TabStrip
        panelId={props.panelId}
        tabs={props.tabs}
        activeTabId={props.activeTabId}
        onSelect={props.onTabSelect}
        onAdd={props.onTabAdd}
        onClose={props.onTabClose}
        onTabDrop={props.onTabDrop}
      />
      <PanelHeader
        title={props.title}
        mode={props.mode}
        content={props.content}
        onModeChange={props.onModeChange}
        onContentChange={props.onContentChange}
        onTitleChange={props.onTitleChange}
        onSave={props.onSave}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
        onCompare={props.onCompare}
      />
      <div className="flex-1 overflow-hidden relative">
        <JSONEditorWrapper
          content={props.content}
          mode={props.mode}
          theme={props.theme}
          onChange={props.onContentChange}
          onChangeMode={props.onModeChange}
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,application/json"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
}
