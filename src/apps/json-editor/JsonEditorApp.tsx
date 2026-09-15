import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import type {
  LayoutType,
  Theme,
  PanelState,
  PanelId,
  EditorMode,
  SavedDocument,
  JsonEditorState,
  TabState,
} from '@/types';
import { DEFAULT_PANEL_TITLES } from '@/types';
import {
  getJsonEditorState,
  saveJsonEditorState,
  getLegacyPreferencesRaw,
  saveDocument,
} from '@/lib/db';
import { formatJson, generateId } from '@/lib/json-utils';
import { createDefaultTab, getActiveTab } from './tabs';
import PanelGrid from './components/PanelGrid';
import DocumentDialog from './components/DocumentDialog';
import SaveDialog from './components/SaveDialog';
import CompareDialog from './components/CompareDialog';

interface Props {
  theme: Theme;
  onLayoutChange?: (layout: LayoutType) => void;
}

export interface JsonEditorHandle {
  setLayout: (layout: LayoutType) => void;
  formatAll: () => void;
  openDocuments: () => void;
  importUrl: (text: string, panelIndex: number) => void;
}

function ensurePanelHasTab(panel: PanelState | undefined, index: number): PanelState {
  const id = index as PanelId;
  if (panel && panel.tabs.length > 0) {
    const activeTabId = panel.tabs.some((t) => t.id === panel.activeTabId)
      ? panel.activeTabId
      : panel.tabs[0].id;
    return { id, activeTabId, tabs: panel.tabs };
  }
  const tab = createDefaultTab(DEFAULT_PANEL_TITLES[index] ?? `Document ${index + 1}`);
  return { id, activeTabId: tab.id, tabs: [tab] };
}

function createDefaultPanels(): PanelState[] {
  return Array.from({ length: 4 }, (_, i) => ensurePanelHasTab(undefined, i));
}

function padPanels(panels: PanelState[]): PanelState[] {
  const result: PanelState[] = [];
  for (let i = 0; i < 4; i++) {
    result.push(ensurePanelHasTab(panels[i], i));
  }
  return result;
}

interface LegacyPanelState {
  mode?: EditorMode;
  content?: string;
  title?: string;
}

function migrateLegacyPanels(legacyPanels: LegacyPanelState[]): PanelState[] {
  const now = Date.now();
  const panels = legacyPanels.map((p, i): PanelState => {
    const tab: TabState = {
      id: generateId(),
      title: p.title ?? DEFAULT_PANEL_TITLES[i] ?? `Document ${i + 1}`,
      mode: p.mode ?? 'tree',
      content: p.content ?? '',
      createdAt: now,
      updatedAt: now,
    };
    return { id: i as PanelId, activeTabId: tab.id, tabs: [tab] };
  });
  return padPanels(panels);
}

function JsonEditorApp({ theme, onLayoutChange }: Props, ref: React.Ref<JsonEditorHandle>) {
  const [layout, setLayout] = useState<LayoutType>('horizontal');
  const [panels, setPanels] = useState<PanelState[]>(() => createDefaultPanels());
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
  const pendingRef = useRef<JsonEditorState | null>(null);

  // Load state on mount, migrating from the pre-tabs preferences shape if needed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await getJsonEditorState();
      if (cancelled) return;
      if (state) {
        setLayout(state.layout);
        onLayoutChange?.(state.layout);
        setPanels(padPanels(state.panels));
        setLoaded(true);
        return;
      }
      const legacy = await getLegacyPreferencesRaw();
      if (cancelled) return;
      if (
        legacy &&
        typeof legacy.layout === 'string' &&
        Array.isArray(legacy.panelStates) &&
        legacy.panelStates.length > 0
      ) {
        const migratedLayout = legacy.layout as LayoutType;
        const migratedPanels = migrateLegacyPanels(
          legacy.panelStates as LegacyPanelState[]
        );
        setLayout(migratedLayout);
        onLayoutChange?.(migratedLayout);
        setPanels(migratedPanels);
        await saveJsonEditorState({ layout: migratedLayout, panels: migratedPanels });
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save state (debounced), flushing any pending save on unmount.
  const persistState = useCallback(
    (newLayout: LayoutType, newPanels: PanelState[]) => {
      pendingRef.current = { layout: newLayout, panels: newPanels };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (pendingRef.current) saveJsonEditorState(pendingRef.current);
        pendingRef.current = null;
      }, 800);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) saveJsonEditorState(pendingRef.current);
    };
  }, []);

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
    persistState(newLayout, panels);
  };

  const updateActiveTab = (id: PanelId, update: (tab: TabState) => TabState) => {
    const newPanels = panels.map((p) =>
      p.id !== id
        ? p
        : { ...p, tabs: p.tabs.map((t) => (t.id === p.activeTabId ? update(t) : t)) }
    );
    setPanels(newPanels);
    persistState(layout, newPanels);
  };

  const handleModeChange = (id: PanelId, mode: EditorMode) => {
    updateActiveTab(id, (t) => ({ ...t, mode }));
  };

  const handleContentChange = (id: PanelId, content: string) => {
    updateActiveTab(id, (t) => ({ ...t, content, updatedAt: Date.now() }));
  };

  const handleTitleChange = (id: PanelId, title: string) => {
    updateActiveTab(id, (t) => ({ ...t, title }));
  };

  const handleFormatAll = () => {
    const newPanels = panels.map((p) => ({
      ...p,
      tabs: p.tabs.map((t) => {
        if (!t.content.trim()) return t;
        try {
          return { ...t, content: formatJson(t.content) };
        } catch {
          return t;
        }
      }),
    }));
    setPanels(newPanels);
    persistState(layout, newPanels);
  };

  const handleSavePanel = (id: PanelId) => {
    setSavePanelId(id);
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async (name: string) => {
    const panel = panels[savePanelId];
    if (!panel) return;
    const activeTab = getActiveTab(panel);
    const doc: SavedDocument = {
      id: generateId(),
      name,
      content: activeTab.content,
      size: new Blob([activeTab.content]).size,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    await saveDocument(doc);
    setSaveDialogOpen(false);
  };

  const handleLoadDoc = (doc: SavedDocument, targetPanel?: PanelId) => {
    const targetId = targetPanel !== undefined ? targetPanel : 0;
    updateActiveTab(targetId, (t) => ({
      ...t,
      content: doc.content,
      title: doc.name,
      updatedAt: Date.now(),
    }));
  };

  const handleCompare = (id: PanelId) => {
    const otherId = panels.find(
      (p) => p.id !== id && getActiveTab(p).content.trim()
    )?.id;
    setCompareState({
      open: true,
      leftId: id,
      rightId: otherId ?? (id === 0 ? 1 : 0),
    });
  };

  const handleImportUrl = (text: string, panelIndex: number) => {
    updateActiveTab(panelIndex as PanelId, (t) => ({
      ...t,
      content: text,
      updatedAt: Date.now(),
    }));
  };

  const handleTabAdd = (panelId: PanelId) => {
    const newPanels = panels.map((p) => {
      if (p.id !== panelId) return p;
      const tab = createDefaultTab(`Untitled ${p.tabs.length + 1}`);
      return { ...p, activeTabId: tab.id, tabs: [...p.tabs, tab] };
    });
    setPanels(newPanels);
    persistState(layout, newPanels);
  };

  const handleTabSelect = (panelId: PanelId, tabId: string) => {
    const newPanels = panels.map((p) =>
      p.id === panelId ? { ...p, activeTabId: tabId } : p
    );
    setPanels(newPanels);
    persistState(layout, newPanels);
  };

  const handleTabClose = (panelId: PanelId, tabId: string) => {
    const newPanels = panels.map((p) => {
      if (p.id !== panelId) return p;
      const closingIndex = p.tabs.findIndex((t) => t.id === tabId);
      if (closingIndex === -1) return p;
      const remaining = p.tabs.filter((t) => t.id !== tabId);
      if (remaining.length === 0) {
        const tab = createDefaultTab(
          DEFAULT_PANEL_TITLES[p.id] ?? `Document ${p.id + 1}`
        );
        return { ...p, activeTabId: tab.id, tabs: [tab] };
      }
      let activeTabId = p.activeTabId;
      if (activeTabId === tabId) {
        const newActiveIndex = Math.min(
          Math.max(0, closingIndex - 1),
          remaining.length - 1
        );
        activeTabId = remaining[newActiveIndex].id;
      }
      return { ...p, activeTabId, tabs: remaining };
    });
    setPanels(newPanels);
    persistState(layout, newPanels);
  };

  useImperativeHandle(ref, () => ({
    setLayout: handleLayoutChange,
    formatAll: handleFormatAll,
    openDocuments: () => setDocDialogOpen(true),
    importUrl: handleImportUrl,
  }));

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  const leftPanel = panels[compareState.leftId];
  const rightPanel = panels[compareState.rightId];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <PanelGrid
          layout={layout}
          panels={panels}
          theme={theme}
          onModeChange={handleModeChange}
          onContentChange={handleContentChange}
          onTitleChange={handleTitleChange}
          onTabSelect={handleTabSelect}
          onTabAdd={handleTabAdd}
          onTabClose={handleTabClose}
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
        defaultName={panels[savePanelId] ? getActiveTab(panels[savePanelId]).title : 'Document'}
        content={panels[savePanelId] ? getActiveTab(panels[savePanelId]).content : ''}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleConfirmSave}
      />

      <CompareDialog
        open={compareState.open}
        onClose={() => setCompareState({ ...compareState, open: false })}
        leftTitle={leftPanel ? getActiveTab(leftPanel).title : 'Left'}
        rightTitle={rightPanel ? getActiveTab(rightPanel).title : 'Right'}
        leftContent={leftPanel ? getActiveTab(leftPanel).content : ''}
        rightContent={rightPanel ? getActiveTab(rightPanel).content : ''}
      />
    </div>
  );
}

export default forwardRef(JsonEditorApp);
