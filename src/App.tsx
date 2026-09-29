import { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import {
  Sun,
  Moon,
  Share2,
  Braces,
  FolderOpen,
  Link as LinkIcon,
  Square,
  Columns2,
  Rows2,
  Grid2x2,
  Copy,
  Download,
  GitCompare,
  Trash2,
  Sparkles,
} from 'lucide-react';
import type { AppPreferences, Theme, ToolId, LayoutType, PanelId } from '@/types';
import { MAX_PANELS } from '@/types';
import { getPreferences, savePreferences, getToolState, saveToolState } from '@/lib/db';
import { TOOLS, getToolFromPath, getPathForTool } from '@/lib/tools';
import { applyToolSeo } from '@/lib/seo';
import {
  readSharePayload,
  copyShareLink,
  getShareableState,
  type SharePayload,
  type SharedJsonTab,
} from '@/lib/share';
import { showToast } from '@/lib/toast';
import { CURRENT_VERSION, PRE_CHANGELOG_VERSION, compareVersions } from '@/lib/changelog';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Toaster from '@/components/Toaster';
import TooltipLayer from '@/components/TooltipLayer';
import WhatsNewDialog from '@/components/WhatsNewDialog';
import CommandPalette, { type Command } from '@/components/CommandPalette';
import JsonEditorApp, { type JsonEditorHandle } from '@/apps/json-editor/JsonEditorApp';
import { PANEL_TRANSFORMS, type PanelActionId } from '@/apps/json-editor/panel-actions';

const SvgPreviewApp = lazy(() => import('@/apps/svg-preview/SvgPreviewApp'));
const HtmlPreviewApp = lazy(() => import('@/apps/html-preview/HtmlPreviewApp'));
const MarkdownApp = lazy(() => import('@/apps/markdown/MarkdownApp'));
const Base64App = lazy(() => import('@/apps/base64/Base64App'));
const CompareApp = lazy(() => import('@/apps/compare/CompareApp'));
const StringifyApp = lazy(() => import('@/apps/stringify/StringifyApp'));
const RegexApp = lazy(() => import('@/apps/regex/RegexApp'));
const TypesApp = lazy(() => import('@/apps/types/TypesApp'));

const layoutCommands: { type: LayoutType; label: string; icon: typeof Square }[] = [
  { type: 'single', label: '1 panel', icon: Square },
  { type: 'horizontal', label: '2 panels side-by-side', icon: Columns2 },
  { type: 'vertical', label: '2 panels stacked', icon: Rows2 },
  { type: 'grid', label: '2x2 grid', icon: Grid2x2 },
];

const panelCommands: { action: PanelActionId; label: string; icon: typeof Square; keywords?: string }[] = [
  ...PANEL_TRANSFORMS.map(({ id, label, icon }) => ({
    action: id,
    label,
    icon,
    keywords: id === 'format' ? 'prettify beautify indent' : id === 'compact' ? 'minify' : undefined,
  })),
  { action: 'copy', label: 'Copy', icon: Copy },
  { action: 'export', label: 'Export file', icon: Download, keywords: 'download save' },
  { action: 'share', label: 'Copy share link', icon: Share2, keywords: 'url' },
  { action: 'compare', label: 'Compare with another document', icon: GitCompare, keywords: 'diff' },
  { action: 'clear', label: 'Clear', icon: Trash2, keywords: 'empty reset' },
];

function isUnseen(lastSeenVersion: string | null): boolean {
  return lastSeenVersion === null || compareVersions(CURRENT_VERSION, lastSeenVersion) > 0;
}

// A shared link only asks before replacing if the user already has different content there.
function wouldOverwrite(existing: Record<string, unknown> | null, shared: Record<string, unknown>): boolean {
  if (!existing) return false;
  return Object.entries(shared).some(
    ([key, value]) => typeof existing[key] === 'string' && existing[key] !== '' && existing[key] !== value
  );
}

export default function App() {
  // Read before any effect canonicalizes the URL (which drops the fragment).
  const [initialShare] = useState(() => readSharePayload(window.location.hash));
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTool, setActiveTool] = useState<ToolId>(
    () => initialShare?.tool ?? getToolFromPath(window.location.pathname)
  );
  const [loaded, setLoaded] = useState(false);
  const [jsonLayout, setJsonLayout] = useState<LayoutType>('horizontal');
  const [sharedJsonTab, setSharedJsonTab] = useState<SharedJsonTab | null>(() =>
    initialShare?.tool === 'json' ? (initialShare.state as unknown as SharedJsonTab) : null
  );
  const [pendingShare, setPendingShare] = useState<SharePayload | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  // Versions newer than this are badged "New" in the open dialog; null badges nothing.
  const [whatsNewSince, setWhatsNewSince] = useState<string | null>(null);
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(CURRENT_VERSION);
  const jsonEditorRef = useRef<JsonEditorHandle>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<AppPreferences | null>(null);
  const prefsRef = useRef<AppPreferences>({ theme: 'dark' });

  // Canonicalize the URL once on mount (e.g. an unknown path falls back to '/', and a
  // consumed share fragment is removed so a reload doesn't re-import it).
  useEffect(() => {
    const canonicalPath = getPathForTool(activeTool);
    if (window.location.pathname !== canonicalPath || initialShare) {
      window.history.replaceState(null, '', canonicalPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep activeTool in sync with browser back/forward navigation.
  useEffect(() => {
    const handlePopState = () => {
      setActiveTool(getToolFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Pasting a share link into an already-open tab only changes the fragment; reload to import it.
  useEffect(() => {
    const handleHashChange = () => {
      if (readSharePayload(window.location.hash)) window.location.reload();
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keep <title>/meta description/canonical in sync with the active tool.
  useEffect(() => {
    applyToolSeo(activeTool);
  }, [activeTool]);

  useEffect(() => {
    // Capture phase so the shortcut still works while focus is inside the JSON editor.
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  useEffect(() => {
    getPreferences().then(async (prefs) => {
      if (prefs) {
        setTheme(prefs.theme);
        prefsRef.current = prefs;
        const seen =
          prefs.lastSeenVersion === undefined ? PRE_CHANGELOG_VERSION : prefs.lastSeenVersion;
        setLastSeenVersion(seen);
        // Don't stack the popup on top of a shared link; the Topbar badge still points to it.
        if (isUnseen(seen) && !initialShare) openWhatsNew(seen);
      } else {
        // First visit: let the user settle in; the popup introduces the app on their next visit.
        persistPrefs({ lastSeenVersion: null }, true);
      }
      // Shared content is written before the tool mounts, so the tool simply loads it.
      if (initialShare && initialShare.tool !== 'json') {
        const existing = await getToolState<Record<string, unknown>>(initialShare.tool);
        if (wouldOverwrite(existing, initialShare.state)) {
          setPendingShare(initialShare);
        } else {
          await saveToolState(initialShare.tool, initialShare.state);
          showToast('Opened shared content', 'success');
        }
      }
      setLoaded(true);
    });
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) savePreferences(pendingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistPrefs = useCallback((patch: Partial<AppPreferences>, immediate = false) => {
    prefsRef.current = { ...prefsRef.current, ...patch };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (immediate) {
      pendingRef.current = null;
      savePreferences(prefsRef.current);
      return;
    }
    pendingRef.current = prefsRef.current;
    saveTimerRef.current = setTimeout(() => {
      if (pendingRef.current) savePreferences(pendingRef.current);
      pendingRef.current = null;
    }, 800);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    persistPrefs({ theme: newTheme });
  };

  const openWhatsNew = useCallback(
    (seen: string | null) => {
      setWhatsNewSince(seen);
      setWhatsNewOpen(true);
      // Marked seen as soon as it's shown, so a reload doesn't bring it back before the next release.
      setLastSeenVersion(CURRENT_VERSION);
      persistPrefs({ lastSeenVersion: CURRENT_VERSION }, true);
    },
    [persistPrefs]
  );

  const handleToolChange = (newTool: ToolId) => {
    setActiveTool(newTool);
    const path = getPathForTool(newTool);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  const handleAcceptShare = async () => {
    if (!pendingShare) return;
    await saveToolState(pendingShare.tool, pendingShare.state);
    setPendingShare(null);
    showToast('Opened shared content', 'success');
  };

  const handleShareTool = () => copyShareLink(activeTool, getShareableState(activeTool));

  const jsonPanelCount = MAX_PANELS[jsonLayout];

  const commands = useMemo((): Command[] => {
    const list: Command[] = TOOLS.map((tool) => ({
      id: `tool:${tool.id}`,
      label: tool.label,
      group: 'Tools',
      icon: tool.icon,
      keywords: 'go open switch',
      run: () => handleToolChange(tool.id),
    }));
    list.push({
      id: 'theme',
      label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      group: 'General',
      icon: theme === 'dark' ? Sun : Moon,
      keywords: 'theme toggle',
      run: () => handleThemeChange(theme === 'dark' ? 'light' : 'dark'),
    });
    list.push({
      id: 'whats-new',
      label: "What's new",
      group: 'General',
      icon: Sparkles,
      keywords: 'changelog release notes version updates',
      run: () => openWhatsNew(lastSeenVersion),
    });
    if (activeTool !== 'json') {
      list.push({
        id: 'share',
        label: 'Copy share link',
        group: 'General',
        icon: Share2,
        keywords: 'url link',
        run: handleShareTool,
      });
      return list;
    }

    const editor = () => jsonEditorRef.current;
    list.push(
      { id: 'json:format-all', label: 'Format all panels', group: 'JSON Editor', icon: Braces, keywords: 'prettify', run: () => editor()?.formatAll() },
      { id: 'json:compare', label: 'Compare JSON documents', group: 'JSON Editor', icon: GitCompare, keywords: 'diff structure', run: () => editor()?.compare() },
      { id: 'json:documents', label: 'Open saved documents', group: 'JSON Editor', icon: FolderOpen, run: () => editor()?.openDocuments() },
      { id: 'json:import-url', label: 'Import from URL', group: 'JSON Editor', icon: LinkIcon, keywords: 'fetch', run: () => setUrlModalOpen(true) },
      ...layoutCommands.map(({ type, label, icon }) => ({
        id: `json:layout:${type}`,
        label: `Layout: ${label}`,
        group: 'JSON Editor',
        icon,
        keywords: 'view split',
        run: () => editor()?.setLayout(type),
      }))
    );
    for (let i = 0; i < jsonPanelCount; i++) {
      const group = jsonPanelCount > 1 ? `Panel ${i + 1}` : 'Document';
      for (const { action, label, icon, keywords } of panelCommands) {
        list.push({
          id: `json:panel:${i}:${action}`,
          label,
          group,
          icon,
          keywords,
          run: () => editor()?.runPanelAction(i as PanelId, action),
        });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, theme, jsonPanelCount, lastSeenVersion]);

  if (!loaded) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  const pendingToolLabel = TOOLS.find((t) => t.id === pendingShare?.tool)?.label;

  return (
    <div
      className={`h-screen flex overflow-hidden ${
        theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <Sidebar activeTool={activeTool} onChange={handleToolChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          theme={theme}
          onThemeChange={handleThemeChange}
          activeTool={activeTool}
          jsonLayout={jsonLayout}
          jsonPanelCount={jsonPanelCount}
          onJsonLayoutChange={(layout) => jsonEditorRef.current?.setLayout(layout)}
          onFormatAll={() => jsonEditorRef.current?.formatAll()}
          onCompare={() => jsonEditorRef.current?.compare()}
          onOpenDocuments={() => jsonEditorRef.current?.openDocuments()}
          onImportUrl={(text, panelIndex) => jsonEditorRef.current?.importUrl(text, panelIndex)}
          urlModalOpen={urlModalOpen}
          onUrlModalOpenChange={setUrlModalOpen}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenWhatsNew={() => openWhatsNew(lastSeenVersion)}
          hasUnseenUpdates={isUnseen(lastSeenVersion)}
          onShare={activeTool !== 'json' ? handleShareTool : undefined}
        />
        <div className="flex-1 overflow-hidden">
          {activeTool === 'json' && (
            <JsonEditorApp
              ref={jsonEditorRef}
              theme={theme}
              onLayoutChange={setJsonLayout}
              sharedTab={sharedJsonTab}
              onSharedTabConsumed={() => {
                setSharedJsonTab(null);
                showToast('Opened shared document in a new tab', 'success');
              }}
            />
          )}
          {/* Tools stay unmounted until a pending share is resolved, so they load the chosen state. */}
          {!pendingShare && (
            <Suspense fallback={null}>
              {activeTool === 'svg' && <SvgPreviewApp />}
              {activeTool === 'html' && <HtmlPreviewApp />}
              {activeTool === 'markdown' && <MarkdownApp theme={theme} />}
              {activeTool === 'base64' && <Base64App />}
              {activeTool === 'compare' && <CompareApp />}
              {activeTool === 'stringify' && <StringifyApp />}
              {activeTool === 'regex' && <RegexApp />}
              {activeTool === 'types' && <TypesApp />}
            </Suspense>
          )}
        </div>
      </div>

      {pendingShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">Open shared content?</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              This link contains {pendingToolLabel} content. Opening it replaces what you currently have in{' '}
              {pendingToolLabel}.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingShare(null)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Keep mine
              </button>
              <button
                onClick={handleAcceptShare}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      <WhatsNewDialog
        open={whatsNewOpen && !pendingShare}
        lastSeenVersion={whatsNewSince}
        onClose={() => setWhatsNewOpen(false)}
        onOpenTool={(tool) => {
          setWhatsNewOpen(false);
          handleToolChange(tool);
        }}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <Toaster />
      <TooltipLayer />
    </div>
  );
}
