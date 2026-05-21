import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'chitchat-keys';
const STORE_KEYS = 'keyring';
const STORE_SESSIONS = 'sessions';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

// Initialize secure IndexedDB
function getDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS);
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS);
      }
    },
  });

  return dbPromise;
}

// Save a key value securely in IndexedDB
export async function saveSecureKey(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put(STORE_KEYS, value, key);
}

// Retrieve a key value securely from IndexedDB
export async function getSecureKey(key: string): Promise<string | undefined> {
  const db = await getDB();
  return db.get(STORE_KEYS, key);
}

// Clear all local secure key states (lock vault)
export async function clearVault(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([STORE_KEYS, STORE_SESSIONS], 'readwrite');
  await tx.objectStore(STORE_KEYS).clear();
  await tx.objectStore(STORE_SESSIONS).clear();
  await tx.done;
}

// Save a Double Ratchet session state for a peer
export async function saveSessionState(peerId: string, stateString: string): Promise<void> {
  const db = await getDB();
  await db.put(STORE_SESSIONS, stateString, peerId);
}

// Retrieve the session state for a peer
export async function getSessionState(peerId: string): Promise<string | undefined> {
  const db = await getDB();
  return db.get(STORE_SESSIONS, peerId);
}
