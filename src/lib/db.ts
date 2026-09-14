import type { AppPreferences, SavedDocument } from '@/types';

const DB_NAME = 'json-editor-db';
const DB_VERSION = 1;
const DOC_STORE = 'documents';
const PREF_STORE = 'preferences';

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
