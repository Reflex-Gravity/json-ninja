import { Braces, Image, FileCode2, Binary } from 'lucide-react';
import type { ToolId } from '@/types';

export const TOOLS: { id: ToolId; label: string; icon: typeof Braces }[] = [
  { id: 'json', label: 'JSON Editor', icon: Braces },
  { id: 'svg', label: 'SVG Preview', icon: Image },
  { id: 'html', label: 'HTML Preview', icon: FileCode2 },
  { id: 'base64', label: 'Base64', icon: Binary },
];
