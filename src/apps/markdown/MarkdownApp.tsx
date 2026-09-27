import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { marked } from 'marked';
import { Copy, Check, Download, Trash2 } from 'lucide-react';
import type { MarkdownToolState, Theme } from '@/types';
import { useToolState } from '@/lib/use-tool-state';
import PreviewFrame from '@/components/PreviewFrame';

interface Props {
  theme: Theme;
}

const DEFAULT_STATE: MarkdownToolState = {
  content: `# Hello, Markdown

Write **GitHub-flavored** Markdown on the left and see it rendered on the right.

- [x] Tables, task lists, and ~~strikethrough~~
- [ ] Fenced code blocks

| Tool | Runs in |
| ---- | ------- |
| GravityTools | Your browser |

\`\`\`json
{ "private": true }
\`\`\`
`,
};

const buttonClass =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';

function previewStyles(theme: Theme): string {
  const dark = theme === 'dark';
  const text = dark ? '#e5e7eb' : '#1f2937';
  const muted = dark ? '#9ca3af' : '#6b7280';
  const border = dark ? '#374151' : '#e5e7eb';
  const codeBg = dark ? '#111827' : '#f3f4f6';
  return `
    html { background: ${dark ? '#1f2937' : '#ffffff'}; }
    body { margin: 0; padding: 24px 32px; color: ${text}; font: 14px/1.65 -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    article { max-width: 820px; margin: 0 auto; }
    h1, h2 { border-bottom: 1px solid ${border}; padding-bottom: .3em; }
    h1, h2, h3, h4 { margin: 1.4em 0 .6em; line-height: 1.25; }
    a { color: ${dark ? '#60a5fa' : '#2563eb'}; }
    code { font: 12.5px ui-monospace, SFMono-Regular, Menlo, monospace; background: ${codeBg}; padding: .15em .35em; border-radius: 4px; }
    pre { background: ${codeBg}; padding: 12px 14px; border-radius: 6px; overflow: auto; }
    pre code { background: none; padding: 0; }
    blockquote { margin: 0; padding: 0 1em; color: ${muted}; border-left: 4px solid ${border}; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid ${border}; padding: 6px 12px; }
    th { background: ${codeBg}; }
    img { max-width: 100%; }
    hr { border: 0; border-top: 1px solid ${border}; }
    ul:has(> li > input[type=checkbox]) { list-style: none; padding-left: 1.2em; }
  `;
}

function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true }) as string;
}

export default function MarkdownApp({ theme }: Props) {
  const { state, update, loaded } = useToolState('markdown', DEFAULT_STATE);
  const [copied, setCopied] = useState(false);

  // Rendering is cheap but not free; keep typing responsive on long documents.
  const deferredContent = useDeferredValue(state.content);
  const html = useMemo(() => renderMarkdown(deferredContent), [deferredContent]);
  // Links open in a new tab so clicking one doesn't navigate the preview frame away.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${previewStyles(theme)}</style></head><body><article>${html}</article></body></html>`;

  const words = state.content.trim() ? state.content.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
    } catch {
      // ignore
    }
  };

  const handleExport = () => {
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Document</title><style>${previewStyles('light')}</style></head><body><article>${html}</article></body></html>`;
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {words} word{words === 1 ? '' : 's'} · {state.content.length} characters
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handleCopyHtml} title="Copy rendered HTML" className={buttonClass}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy HTML'}
          </button>
          <button onClick={handleExport} title="Download as a standalone HTML file" className={buttonClass}>
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={() => update({ content: '' })} title="Clear" className={buttonClass}>
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <textarea
            value={state.content}
            onChange={(e) => update({ content: e.target.value })}
            spellCheck={false}
            placeholder="Write Markdown..."
            className="flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
        </div>
        <div className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <PreviewFrame srcDoc={srcDoc} scriptsEnabled={false} allowPopups />
        </div>
      </div>
    </div>
  );
}
