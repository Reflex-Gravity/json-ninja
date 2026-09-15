import type { AppPreferences, JsonEditorState, SavedDocument } from '@/types';

const DB_NAME = 'json-editor-db';
const DB_VERSION = 2;
const DOC_STORE = 'documents';
const PREF_STORE = 'preferences';
const JSON_EDITOR_STORE = 'json-editor-state';
const TOOL_STATE_STORE = 'tool-state';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOC_STORE)) {
        db.createObjectStore(DOC_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PREF_STORE)) {
        db.createObjectStore(PREF_STORE);
      }
      if (!db.objectStoreNames.contains(JSON_EDITOR_STORE)) {
        db.createObjectStore(JSON_EDITOR_STORE);
      }
      if (!db.objectStoreNames.contains(TOOL_STATE_STORE)) {
        db.createObjectStore(TOOL_STATE_STORE);
      }
    };
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const req = fn(transaction.objectStore(store));
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      })
  );
}

export async function getAllDocuments(): Promise<SavedDocument[]> {
  const docs = await tx<SavedDocument[]>(DOC_STORE, 'readonly', (s) =>
    s.getAll()
  );
  return docs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveDocument(
  doc: SavedDocument
): Promise<SavedDocument> {
  await tx(DOC_STORE, 'readwrite', (s) => s.put(doc));
  return doc;
}

export async function deleteDocument(id: string): Promise<void> {
  await tx(DOC_STORE, 'readwrite', (s) => s.delete(id));
}

export async function getPreferences(): Promise<AppPreferences | null> {
  return tx<AppPreferences | undefined>(PREF_STORE, 'readonly', (s) =>
    s.get('app')
  ).then((r) => r ?? null);
}

export async function savePreferences(prefs: AppPreferences): Promise<void> {
  await tx(PREF_STORE, 'readwrite', (s) => s.put(prefs, 'app'));
}

// Pre-v2 installs stored { layout, theme, panelStates } in the same 'app' record.
// Read it loosely (not as AppPreferences) so JsonEditorApp can migrate it once.
export async function getLegacyPreferencesRaw(): Promise<
  Record<string, unknown> | undefined
> {
  return tx<Record<string, unknown> | undefined>(PREF_STORE, 'readonly', (s) =>
    s.get('app')
  );
}

export async function getJsonEditorState(): Promise<JsonEditorState | null> {
  return tx<JsonEditorState | undefined>(JSON_EDITOR_STORE, 'readonly', (s) =>
    s.get('state')
  ).then((r) => r ?? null);
}

export async function saveJsonEditorState(
  state: JsonEditorState
): Promise<void> {
  await tx(JSON_EDITOR_STORE, 'readwrite', (s) => s.put(state, 'state'));
}

export async function getToolState<T>(tool: string): Promise<T | null> {
  return tx<T | undefined>(TOOL_STATE_STORE, 'readonly', (s) =>
    s.get(tool)
  ).then((r) => r ?? null);
}

export async function saveToolState<T>(
  tool: string,
  state: T
): Promise<void> {
  await tx(TOOL_STATE_STORE, 'readwrite', (s) => s.put(state, tool));
}
