import { encryptString, decryptString } from './crypto'
import { openDb, STORE_ENTRIES, STORE_TOMBSTONES } from './idb'
import type { MoodEntry } from '@/models/moodEntry'

const SHEET_REF_KEY = 'mood-journal-spreadsheet:v1'

export interface SheetRef {
  id: string
  title: string
}

export function loadSheetRef(): SheetRef | null {
  try {
    const raw = localStorage.getItem(SHEET_REF_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as SheetRef).id === 'string' &&
      typeof (parsed as SheetRef).title === 'string'
    ) {
      return parsed as SheetRef
    }
    return null
  } catch {
    return null
  }
}

export function saveSheetRef(ref: SheetRef): void {
  localStorage.setItem(SHEET_REF_KEY, JSON.stringify(ref))
}

export function clearSheetRef(): void {
  localStorage.removeItem(SHEET_REF_KEY)
}

function readAllValues<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function runWriteTxn(
  db: IDBDatabase,
  store: string,
  action: (store: IDBObjectStore) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    action(tx.objectStore(store))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function loadLocalEntries(): Promise<MoodEntry[]> {
  try {
    const db = await openDb()
    const ciphertexts = await readAllValues<string>(db, STORE_ENTRIES)
    const decoded = await Promise.all(
      ciphertexts.map(async (ct) => {
        const decrypted = await decryptString(ct)
        return JSON.parse(decrypted) as Partial<MoodEntry> & Omit<MoodEntry, 'syncStatus'>
      })
    )
    // Entries written before syncStatus was introduced default to 'pending' so
    // the next sync can reconcile them against Sheets rather than silently drop them.
    return decoded.map((e) => ({ ...e, syncStatus: e.syncStatus ?? 'pending' }) as MoodEntry)
  } catch {
    return []
  }
}

export async function saveLocalEntries(entries: MoodEntry[]): Promise<void> {
  try {
    // Encrypt before opening the txn — IDB transactions auto-close on async pauses.
    const records = await Promise.all(
      entries.map(async (e) => ({ id: e.id, ciphertext: await encryptString(JSON.stringify(e)) }))
    )
    const db = await openDb()
    await runWriteTxn(db, STORE_ENTRIES, (store) => {
      store.clear()
      for (const r of records) store.put(r.ciphertext, r.id)
    })
  } catch {
    // Encryption / IDB failure should not crash the app — data is still in memory.
  }
}

export async function clearLocalEntries(): Promise<void> {
  try {
    const db = await openDb()
    await runWriteTxn(db, STORE_ENTRIES, (store) => store.clear())
  } catch {
    // ignore — best effort
  }
}

// Tombstones record ids of entries deleted locally so a sync can propagate the
// deletion to the sheet instead of resurrecting the row. Stored as plain ids
// (random UUIDs) — they carry no mood content, so no encryption is needed.
export async function loadTombstones(): Promise<string[]> {
  try {
    const db = await openDb()
    const values = await readAllValues<unknown>(db, STORE_TOMBSTONES)
    return values.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

export async function saveTombstones(ids: string[]): Promise<void> {
  try {
    const unique = [...new Set(ids)]
    const db = await openDb()
    await runWriteTxn(db, STORE_TOMBSTONES, (store) => {
      store.clear()
      for (const id of unique) store.put(id, id)
    })
  } catch {
    // ignore — best effort
  }
}
