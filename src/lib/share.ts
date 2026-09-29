import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { EditorMode, ToolId } from '@/types';
import { TOOLS, getPathForTool } from '@/lib/tools';
import { showToast } from '@/lib/toast';

const HASH_PREFIX = '#share=';

// Browsers accept multi-MB URLs, but chat apps and email clients truncate or reject long links
// well before that (Slack caps a message at 40k characters), so refuse to build longer ones.
export const MAX_SHARE_URL_LENGTH = 32_000;

export interface SharedJsonTab {
  title: string;
  mode: EditorMode;
  content: string;
}

export interface SharePayload {
  tool: ToolId;
  state: Record<string, unknown>;
}

type FieldSpec = 'string' | 'boolean' | readonly string[];

// Shared links are untrusted input: only fields listed here, with the expected types, are accepted.
const STATE_SHAPES: Record<ToolId, Record<string, FieldSpec>> = {
  json: { title: 'string', mode: ['tree', 'code', 'table'], content: 'string' },
  svg: { content: 'string' },
  html: { content: 'string' },
  markdown: { content: 'string' },
  base64: { mode: ['encode', 'decode'], input: 'string' },
  compare: {
    left: 'string',
    right: 'string',
    ignoreWhitespace: 'boolean',
    ignoreCase: 'boolean',
    normalizeJson: 'boolean',
  },
  stringify: {
    mode: ['stringify', 'parse', 'to-curl', 'from-curl'],
    input: 'string',
    minify: 'boolean',
    method: 'string',
    url: 'string',
    shell: ['bash', 'cmd'],
  },
  regex: {
    pattern: 'string',
    flags: 'string',
    text: 'string',
    replacement: 'string',
    replaceEnabled: 'boolean',
  },
  types: {
    input: 'string',
    rootName: 'string',
    format: ['typescript', 'zod', 'yup'],
    declaration: ['interface', 'type'],
  },
};

function sanitizeState(tool: ToolId, raw: unknown): Record<string, unknown> | null {
  if (raw === null || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;
  const state: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(STATE_SHAPES[tool])) {
    const value = input[key];
    const valid = typeof spec === 'string' ? typeof value === spec : spec.includes(value as string);
    if (!valid) return null;
    state[key] = value;
  }
  return state;
}

// Latest state of each mounted tool, registered by the tool itself so the Topbar can share it.
const shareableStates = new Map<ToolId, unknown>();

export function setShareableState(tool: ToolId, state: unknown) {
  shareableStates.set(tool, state);
}

export function getShareableState(tool: ToolId): unknown {
  return shareableStates.get(tool);
}

export function readSharePayload(hash: string): SharePayload | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const json = decompressFromEncodedURIComponent(hash.slice(HASH_PREFIX.length));
    if (!json) return null;
    const data = JSON.parse(json) as { tool?: unknown; state?: unknown };
    const tool = TOOLS.find((t) => t.id === data.tool)?.id;
    if (!tool) return null;
    const state = sanitizeState(tool, data.state);
    return state ? { tool, state } : null;
  } catch {
    return null;
  }
}

// Content lives only in the URL fragment, which browsers never send to the server.
export async function copyShareLink(tool: ToolId, state: unknown): Promise<void> {
  if (state === undefined) return;
  const encoded = compressToEncodedURIComponent(JSON.stringify({ tool, state }));
  const url = `${window.location.origin}${getPathForTool(tool)}${HASH_PREFIX}${encoded}`;
  if (url.length > MAX_SHARE_URL_LENGTH) {
    const kb = Math.ceil(url.length / 1024);
    showToast(
      `Too large to share as a link (${kb} KB after compression, limit ${MAX_SHARE_URL_LENGTH / 1000} KB). Export it as a file instead.`,
      'error'
    );
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast('Share link copied to clipboard', 'success');
  } catch {
    showToast('Could not access the clipboard', 'error');
  }
}
