const DB_NAME = 'mood-journal'
const DB_VERSION = 1

export const STORE_KEYS = 'keys'
export const STORE_ENTRIES = 'entries'
export const STORE_TOMBSTONES = 'tombstones'

let dbPromise: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    const p = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_KEYS)) db.createObjectStore(STORE_KEYS)
        if (!db.objectStoreNames.contains(STORE_ENTRIES)) db.createObjectStore(STORE_ENTRIES)
        if (!db.objectStoreNames.contains(STORE_TOMBSTONES)) db.createObjectStore(STORE_TOMBSTONES)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    // Reset on failure so a later call can retry rather than reusing a rejected promise.
    p.catch(() => {
      dbPromise = null
    })
    dbPromise = p
  }
  return dbPromise
}

export function resetDbForTesting(): void {
  dbPromise = null
}
