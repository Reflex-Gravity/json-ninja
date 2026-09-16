import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createJSONEditor,
  toTextContent,
  type Content,
  type JSONEditorPropsOptional,
  type Mode,
} from 'vanilla-jsoneditor';
import 'vanilla-jsoneditor/themes/jse-theme-dark.css';
import { Wrench, X } from 'lucide-react';
import type { EditorMode } from '@/types';
import { formatJson, repairJson, tryParseJson } from '@/lib/json-utils';

const modeMap: Record<EditorMode, Mode> = {
  code: 'text' as Mode,
  tree: 'tree' as Mode,
  table: 'table' as Mode,
};

interface Props {
  content: string;
  mode: EditorMode;
  theme: 'light' | 'dark';
  onChange: (text: string) => void;
  onChangeMode: (mode: EditorMode) => void;
}

export default function JSONEditorWrapper({
  content,
  mode,
  theme,
  onChange,
  onChangeMode,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof createJSONEditor> | null>(null);
  const lastContentRef = useRef<string>(content);
  const onChangeRef = useRef(onChange);
  const onChangeModeRef = useRef(onChangeMode);
  const justPastedRef = useRef(false);
  const modeRef = useRef(mode);
  const [repairPrompt, setRepairPrompt] = useState<string | null>(null);

  onChangeRef.current = onChange;
  onChangeModeRef.current = onChangeMode;
  modeRef.current = mode;

  useEffect(() => {
    if (!containerRef.current) return;
    const props: JSONEditorPropsOptional = {
      mode: modeMap[mode],
      mainMenuBar: false,
      navigationBar: false,
      statusBar: false,
      content: { text: content },
      onChange: (updatedContent: Content) => {
        const textContent = toTextContent(updatedContent);
        const text = textContent.text;
        lastContentRef.current = text;
        setRepairPrompt(null);

        if (justPastedRef.current) {
          justPastedRef.current = false;
          if (modeRef.current === 'code' && text.trim() !== '') {
            const validation = tryParseJson(text);
            if (validation.ok) {
              const formatted = formatJson(text);
              if (formatted !== text) {
                lastContentRef.current = formatted;
                editorRef.current?.set({ text: formatted });
                onChangeRef.current(formatted);
                return;
              }
            } else {
              const repaired = repairJson(text);
              if (repaired !== text && tryParseJson(repaired).ok) {
                setRepairPrompt(repaired);
              }
            }
          }
        }

        onChangeRef.current(text);
      },
      onChangeMode: (m) => {
        const uiMode =
          m === 'text' ? 'code' : (m as EditorMode);
        onChangeModeRef.current(uiMode);
      },
    };
    editorRef.current = createJSONEditor({
      target: containerRef.current,
      props,
    });
    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []);

  const updateContent = useCallback((text: string) => {
    if (!editorRef.current) return;
    if (text === lastContentRef.current) return;
    lastContentRef.current = text;
    editorRef.current.set({ text });
    setRepairPrompt(null);
  }, []);

  const updateMode = useCallback((newMode: EditorMode) => {
    if (!editorRef.current) return;
    editorRef.current.updateProps({
      mode: modeMap[newMode],
    });
  }, []);

  useEffect(() => {
    if (content !== lastContentRef.current) {
      updateContent(content);
    }
  }, [content, updateContent]);

  useEffect(() => {
    updateMode(mode);
  }, [mode, updateMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    if (theme === 'dark') {
      el.classList.add('jse-theme-dark');
    } else {
      el.classList.remove('jse-theme-dark');
    }
  }, [theme]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handlePaste = () => {
      justPastedRef.current = true;
    };
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, []);

  const handleApplyRepair = () => {
    if (repairPrompt === null) return;
    const repaired = repairPrompt;
    lastContentRef.current = repaired;
    editorRef.current?.set({ text: repaired });
    onChangeRef.current(repaired);
    setRepairPrompt(null);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full overflow-hidden" data-theme={theme} />
      {repairPrompt !== null && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg px-3 py-2">
          <Wrench className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-gray-700 dark:text-gray-200">Pasted JSON looks invalid</span>
          <button
            onClick={handleApplyRepair}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Repair
          </button>
          <button
            onClick={() => setRepairPrompt(null)}
            title="Dismiss"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function getEditorContent(
  editor: ReturnType<typeof createJSONEditor> | null
): string {
  if (!editor) return '';
  const content = editor.get();
  const textContent = toTextContent(content);
  return textContent.text;
}

export function setEditorContent(
  editor: ReturnType<typeof createJSONEditor> | null,
  text: string
) {
  if (!editor) return;
  editor.set({ text });
}
