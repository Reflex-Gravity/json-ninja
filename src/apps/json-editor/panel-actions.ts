import { Braces, Minimize2, ArrowDownAZ, Wrench } from 'lucide-react';
import { formatJson, compactJson, sortJsonKeys, repairJson } from '@/lib/json-utils';

export type PanelTransformId = 'format' | 'compact' | 'sort' | 'repair';

export type PanelActionId = PanelTransformId | 'copy' | 'share' | 'compare' | 'export' | 'clear';

// Content transforms shared by the panel header buttons and the command palette.
export const PANEL_TRANSFORMS: {
  id: PanelTransformId;
  label: string;
  icon: typeof Braces;
  apply: (content: string) => string;
}[] = [
  { id: 'format', label: 'Format', icon: Braces, apply: formatJson },
  { id: 'compact', label: 'Compact', icon: Minimize2, apply: compactJson },
  { id: 'sort', label: 'Sort keys', icon: ArrowDownAZ, apply: sortJsonKeys },
  { id: 'repair', label: 'Repair JSON', icon: Wrench, apply: repairJson },
];

export function downloadJson(title: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'document'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
