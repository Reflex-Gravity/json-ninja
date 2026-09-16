export type EditorMode = 'tree' | 'code' | 'table';

export type LayoutType = 'single' | 'horizontal' | 'vertical' | 'grid';

export type Theme = 'light' | 'dark';

export type PanelId = 0 | 1 | 2 | 3;

export type ToolId = 'json' | 'svg' | 'html' | 'base64';

export interface TabState {
  id: string;
  title: string;
  mode: EditorMode;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface PanelState {
  id: PanelId;
  activeTabId: string;
  tabs: TabState[];
}

export interface JsonEditorState {
  layout: LayoutType;
  panels: PanelState[];
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
  theme: Theme;
}

export interface SvgToolState {
  content: string;
}

export interface HtmlToolState {
  content: string;
}

export interface Base64ToolState {
  mode: 'encode' | 'decode';
  input: string;
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
