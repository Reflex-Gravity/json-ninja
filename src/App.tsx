import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  LayoutType,
  Theme,
  PanelState,
  PanelId,
  EditorMode,
  SavedDocument,
} from '@/types';
import { MAX_PANELS, DEFAULT_PANEL_TITLES } from '@/types';
import {
  getPreferences,
  savePreferences,
  getAllDocuments,
  saveDocument,
} from '@/lib/db';
import { formatJson, generateId } from '@/lib/json-utils';
import Toolbar from '@/components/Toolbar';
import PanelGrid from '@/components/PanelGrid';
import DocumentDialog from '@/components/DocumentDialog';
import SaveDialog from '@/components/SaveDialog';
import CompareDialog from '@/components/CompareDialog';

function createDefaultPanels(count: number): PanelState[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i as PanelId,
    mode: 'tree' as EditorMode,
    content: '',
    title: DEFAULT_PANEL_TITLES[i] ?? `Document ${i + 1}`,
  }));
}

export default function App() {
  const [layout, setLayout] = useState<LayoutType>('horizontal');
  const [theme, setTheme] = useState<Theme>('light');
  const [panels, setPanels] = useState<PanelState[]>(() =>
    createDefaultPanels(MAX_PANELS['horizontal'])
  );
  const [loaded, setLoaded] = useState(false);

  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savePanelId, setSavePanelId] = useState<PanelId>(0);
  const [compareState, setCompareState] = useState<{
    open: boolean;
    leftId: PanelId;
    rightId: PanelId;
  }>({ open: false, leftId: 0, rightId: 1 });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePanelCount = MAX_PANELS[layout];

  // Load preferences on mount
  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs) {
        setLayout(prefs.layout);
        setTheme(prefs.theme);
        const needed = MAX_PANELS[prefs.layout];
        if (prefs.panelStates.length >= needed) {
          setPanels(prefs.panelStates.slice(0, 4));
        } else {
          setPanels(createDefaultPanels(4));
        }
      }
      setLoaded(true);
    });
  }, []);

  // Save preferences (debounced)
  const persistPrefs = useCallback(
    (newLayout: LayoutType, newTheme: Theme, newPanels: PanelState[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        savePreferences({
          layout: newLayout,
          theme: newTheme,
          panelStates: newPanels,
        });
      }, 800);
    },
    []
  );

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout);
    persistPrefs(newLayout, theme, panels);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    persistPrefs(layout, newTheme, panels);
  };

  const handleModeChange = (id: PanelId, mode: EditorMode) => {
    const newPanels = panels.map((p) => (p.id === id ? { ...p, mode } : p));
    setPanels(newPanels);
    persistPrefs(layout, theme, newPanels);
  };

  const handleContentChange = (id: PanelId, content: string) => {
    const newPanels = panels.map((p) => (p.id === id ? { ...p, content } : p));
    setPanels(newPanels);
    persistPrefs(layout, theme, newPanels);
  };

  const handleTitleChange = (id: PanelId, title: string) => {
    const newPanels = panels.map((p) => (p.id === id ? { ...p, title } : p));
    setPanels(newPanels);
    persistPrefs(layout, theme, newPanels);
  };

  const handleFormatAll = () => {
    const newPanels = panels.map((p) => {
      if (!p.content.trim()) return p;
      try {
        return { ...p, content: formatJson(p.content) };
      } catch {
        return p;
      }
    });
    setPanels(newPanels);
    persistPrefs(layout, theme, newPanels);
  };

  const handleSavePanel = (id: PanelId) => {
    setSavePanelId(id);
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async (name: string) => {
    const panel = panels[savePanelId];
    if (!panel) return;
    const doc: SavedDocument = {
      id: generateId(),
      name,
      content: panel.content,
      size: new Blob([panel.content]).size,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    await saveDocument(doc);
    setSaveDialogOpen(false);
  };

  const handleLoadDoc = (doc: SavedDocument, targetPanel?: PanelId) => {
    const targetId =
      targetPanel !== undefined ? targetPanel : 0;
    const newPanels = panels.map((p) =>
      p.id === targetId
        ? { ...p, content: doc.content, title: doc.name }
        : p
    );
    setPanels(newPanels);
    persistPrefs(layout, theme, newPanels);
  };

  const handleCompare = (id: PanelId) => {
    // find the next available panel for comparison
    const otherId = panels.find((p) => p.id !== id && p.content.trim())?.id;
    setCompareState({
      open: true,
      leftId: id,
      rightId: otherId ?? (id === 0 ? 1 : 0),
    });
  };

  const handleImportUrl = (text: string, panelIndex: number) => {
    const newPanels = panels.map((p) =>
      p.id === panelIndex ? { ...p, content: text } : p
    );
    setPanels(newPanels);
    persistPrefs(layout, theme, newPanels);
  };

  const activePanels = panels.slice(0, activePanelCount);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  const leftPanel = panels[compareState.leftId];
  const rightPanel = panels[compareState.rightId];

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${
        theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <Toolbar
        layout={layout}
        theme={theme}
        onLayoutChange={handleLayoutChange}
        onThemeChange={handleThemeChange}
        onOpenDocuments={() => setDocDialogOpen(true)}
        onFormatAll={handleFormatAll}
        onImportUrl={handleImportUrl}
        panelCount={activePanelCount}
      />

      <div className="flex-1 overflow-hidden">
        <PanelGrid
          layout={layout}
          panels={activePanels}
          theme={theme}
          onModeChange={handleModeChange}
          onContentChange={handleContentChange}
          onTitleChange={handleTitleChange}
          onSave={handleSavePanel}
          onCompare={handleCompare}
        />
      </div>

      <DocumentDialog
        open={docDialogOpen}
        onClose={() => setDocDialogOpen(false)}
        onLoad={(doc) => handleLoadDoc(doc)}
      />

      <SaveDialog
        open={saveDialogOpen}
        defaultName={panels[savePanelId]?.title ?? 'Document'}
        content={panels[savePanelId]?.content ?? ''}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleConfirmSave}
      />

      <CompareDialog
        open={compareState.open}
        onClose={() => setCompareState({ ...compareState, open: false })}
        leftTitle={leftPanel?.title ?? 'Left'}
        rightTitle={rightPanel?.title ?? 'Right'}
        leftContent={leftPanel?.content ?? ''}
        rightContent={rightPanel?.content ?? ''}
      />
    </div>
  );
}
