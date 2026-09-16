import { Braces, Image, FileCode2, Binary } from 'lucide-react';
import type { ToolId } from '@/types';

export const TOOLS: {
  id: ToolId;
  label: string;
  icon: typeof Braces;
  path: string;
  title: string;
  description: string;
}[] = [
  {
    id: 'json',
    label: 'JSON Editor',
    icon: Braces,
    path: '/',
    title: 'JSON Editor & Formatter Online – GravityTools',
    description:
      'Free online JSON editor, formatter, and validator with tree/code/table views, multi-panel comparison, and repair for malformed JSON. 100% private—runs entirely in your browser.',
  },
  {
    id: 'svg',
    label: 'SVG Preview',
    icon: Image,
    path: '/svg',
    title: 'SVG Preview & Viewer Online – GravityTools',
    description:
      'Free online SVG previewer and editor. Paste or upload SVG markup and see an instant live render, entirely in your browser with no upload to a server.',
  },
  {
    id: 'html',
    label: 'HTML Preview',
    icon: FileCode2,
    path: '/html',
    title: 'HTML Preview & Live Renderer Online – GravityTools',
    description:
      'Free online HTML previewer. Paste HTML/CSS/JS and instantly render it in a sandboxed live preview, entirely in your browser with no upload to a server.',
  },
  {
    id: 'base64',
    label: 'Base64',
    icon: Binary,
    path: '/base64',
    title: 'Base64 Encoder & Decoder Online – GravityTools',
    description:
      'Free online Base64 encoder and decoder for text and files. Fast, private, and processed entirely in your browser—your data never leaves your computer.',
  },
];

// Root ('/') is the default route, resolving to the JSON editor.
export function getToolFromPath(pathname: string): ToolId {
  const path = pathname.replace(/\/+$/, '') || '/';
  return TOOLS.find((t) => t.path === path)?.id ?? 'json';
}

export function getPathForTool(id: ToolId): string {
  return TOOLS.find((t) => t.id === id)?.path ?? '/';
}
