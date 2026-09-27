export type EditorMode = 'tree' | 'code' | 'table';

export type LayoutType = 'single' | 'horizontal' | 'vertical' | 'grid';

export type Theme = 'light' | 'dark';

export type PanelId = 0 | 1 | 2 | 3;

export type ToolId =
  | 'json'
  | 'svg'
  | 'html'
  | 'markdown'
  | 'base64'
  | 'compare'
  | 'stringify'
  | 'regex'
  | 'types';

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
  // Newest release whose "What's new" the user has been shown. Undefined for preferences saved
  // before the changelog existed; null for a new user who hasn't been shown it yet.
  lastSeenVersion?: string | null;
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

export type CompareMode = 'text' | 'json';

export interface CompareToolState {
  mode: CompareMode;
  left: string;
  right: string;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  normalizeJson: boolean;
  ignoreArrayOrder: boolean;
}

export interface MarkdownToolState {
  content: string;
}

export interface RegexToolState {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
  replaceEnabled: boolean;
}

export type TypesOutputFormat = 'typescript' | 'zod';

export interface TypesToolState {
  input: string;
  rootName: string;
  format: TypesOutputFormat;
  declaration: 'interface' | 'type';
}

export type StringifyMode = 'stringify' | 'parse' | 'to-curl' | 'from-curl';

export interface StringifyToolState {
  mode: StringifyMode;
  input: string;
  minify: boolean;
  method: string;
  url: string;
  shell: 'bash' | 'cmd';
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
