export type EditorMode = 'tree' | 'code' | 'table';

export type LayoutType = 'single' | 'horizontal' | 'vertical' | 'grid';

export type Theme = 'light' | 'dark';

export type PanelId = 0 | 1 | 2 | 3;

export interface PanelState {
  id: PanelId;
  mode: EditorMode;
  content: string;
  title: string;
}

export interface SavedDocument {
  id: string;
  name: string;
  content: string;
  size: number;
  updatedAt: number;
  createdAt: number;
}

export interface AppPreferences {
  layout: LayoutType;
  theme: Theme;
  panelStates: PanelState[];
}

export const MAX_PANELS: Record<LayoutType, number> = {
  single: 1,
  horizontal: 2,
  vertical: 2,
  grid: 4,
};

export const DEFAULT_PANEL_TITLES: string[] = [
  'Document 1',
  'Document 2',
  'Document 3',
  'Document 4',
];
