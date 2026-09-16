import { Braces, Image, FileCode2, Binary } from 'lucide-react';
import type { ToolId } from '@/types';

export const TOOLS: { id: ToolId; label: string; icon: typeof Braces; path: string }[] = [
  { id: 'json', label: 'JSON Editor', icon: Braces, path: '/' },
  { id: 'svg', label: 'SVG Preview', icon: Image, path: '/svg' },
  { id: 'html', label: 'HTML Preview', icon: FileCode2, path: '/html' },
  { id: 'base64', label: 'Base64', icon: Binary, path: '/base64' },
];

// Root ('/') is the default route, resolving to the JSON editor.
export function getToolFromPath(pathname: string): ToolId {
  const path = pathname.replace(/\/+$/, '') || '/';
  return TOOLS.find((t) => t.path === path)?.id ?? 'json';
}

export function getPathForTool(id: ToolId): string {
  return TOOLS.find((t) => t.id === id)?.path ?? '/';
}
