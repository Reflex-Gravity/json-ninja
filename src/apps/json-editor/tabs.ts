import type { PanelId, PanelState, TabState } from '@/types';
import { generateId } from '@/lib/json-utils';

export function createDefaultTab(title: string): TabState {
  const now = Date.now();
  return {
    id: generateId(),
    title,
    mode: 'tree',
    content: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function getActiveTab(panel: PanelState): TabState {
  return panel.tabs.find((t) => t.id === panel.activeTabId) ?? panel.tabs[0];
}

export function findTab(
  panels: PanelState[],
  panelId: PanelId,
  tabId: string
): TabState | undefined {
  return panels.find((p) => p.id === panelId)?.tabs.find((t) => t.id === tabId);
}
