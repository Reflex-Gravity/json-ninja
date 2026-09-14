import { useEffect, useRef, useCallback } from 'react';
import {
  createJSONEditor,
  toTextContent,
  type Content,
  type JSONEditorPropsOptional,
  type Mode,
} from 'vanilla-jsoneditor';
import 'vanilla-jsoneditor/themes/jse-theme-dark.css';
import type { EditorMode } from '@/types';

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

  onChangeRef.current = onChange;
  onChangeModeRef.current = onChangeMode;

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
        lastContentRef.current = textContent.text;
        onChangeRef.current(textContent.text);
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

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      data-theme={theme}
    />
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
