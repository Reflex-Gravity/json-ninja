import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppPreferences, Theme, ToolId, LayoutType } from '@/types';
import { MAX_PANELS } from '@/types';
import { getPreferences, savePreferences } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import JsonEditorApp, { type JsonEditorHandle } from '@/apps/json-editor/JsonEditorApp';
import SvgPreviewApp from '@/apps/svg-preview/SvgPreviewApp';
import HtmlPreviewApp from '@/apps/html-preview/HtmlPreviewApp';
import Base64App from '@/apps/base64/Base64App';

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [activeTool, setActiveTool] = useState<ToolId>('json');
  const [loaded, setLoaded] = useState(false);
  const [jsonLayout, setJsonLayout] = useState<LayoutType>('horizontal');
  const jsonEditorRef = useRef<JsonEditorHandle>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<AppPreferences | null>(null);

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs) {
        setTheme(prefs.theme);
        setActiveTool(prefs.activeTool ?? 'json');
      }
      setLoaded(true);
    });
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) savePreferences(pendingRef.current);
    };
  }, []);

  const persistShellPrefs = useCallback((newTheme: Theme, newTool: ToolId) => {
    pendingRef.current = { theme: newTheme, activeTool: newTool };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (pendingRef.current) savePreferences(pendingRef.current);
      pendingRef.current = null;
    }, 800);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    persistShellPrefs(newTheme, activeTool);
  };

  const handleToolChange = (newTool: ToolId) => {
    setActiveTool(newTool);
    persistShellPrefs(theme, newTool);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

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
          jsonPanelCount={MAX_PANELS[jsonLayout]}
          onJsonLayoutChange={(layout) => jsonEditorRef.current?.setLayout(layout)}
          onFormatAll={() => jsonEditorRef.current?.formatAll()}
          onOpenDocuments={() => jsonEditorRef.current?.openDocuments()}
          onImportUrl={(text, panelIndex) => jsonEditorRef.current?.importUrl(text, panelIndex)}
        />
        <div className="flex-1 overflow-hidden">
          {activeTool === 'json' && (
            <JsonEditorApp
              ref={jsonEditorRef}
              theme={theme}
              onLayoutChange={setJsonLayout}
            />
          )}
          {activeTool === 'svg' && <SvgPreviewApp />}
          {activeTool === 'html' && <HtmlPreviewApp />}
          {activeTool === 'base64' && <Base64App />}
        </div>
      </div>
    </div>
  );
}
