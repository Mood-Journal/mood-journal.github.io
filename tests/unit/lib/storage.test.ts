import { describe, it, expect, beforeEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import {
  loadSheetRef,
  saveSheetRef,
  clearSheetRef,
  loadLocalEntries,
  saveLocalEntries,
  clearLocalEntries,
  loadTombstones,
  saveTombstones,
} from '../../../src/lib/storage'
import { encryptString, resetKeyForTesting } from '../../../src/lib/crypto'
import { openDb, resetDbForTesting, STORE_ENTRIES } from '../../../src/lib/idb'
import type { MoodEntry } from '../../../src/models/moodEntry'

function resetIdb(): void {
  ;(globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory()
  resetDbForTesting()
  resetKeyForTesting()
}

describe('storage — SheetRef', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no ref is stored', () => {
    expect(loadSheetRef()).toBeNull()
  })

  it('round-trips a SheetRef', () => {
    const ref = { id: 'abc123', title: 'My Sheet' }
    saveSheetRef(ref)
    expect(loadSheetRef()).toEqual(ref)
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem('mood-journal-spreadsheet:v1', 'not-json{')
    expect(loadSheetRef()).toBeNull()
  })

  it('returns null when stored value is missing the title field', () => {
    localStorage.setItem('mood-journal-spreadsheet:v1', JSON.stringify({ id: 'abc' }))
    expect(loadSheetRef()).toBeNull()
  })

  it('returns null when stored value is missing the id field', () => {
    localStorage.setItem('mood-journal-spreadsheet:v1', JSON.stringify({ title: 'Mood Ledger' }))
    expect(loadSheetRef()).toBeNull()
  })

  it('clearSheetRef removes the stored ref', () => {
    saveSheetRef({ id: 'abc', title: 'Test' })
    clearSheetRef()
    expect(loadSheetRef()).toBeNull()
  })
})

const SAMPLE_ENTRY: MoodEntry = {
  id: 'entry-1',
  date: '2026-05-26',
  level1: 'Happy',
  level2: 'Content',
  level3: null,
  note: 'Great day',
  createdAt: '2026-05-26T10:00:00.000Z',
  syncStatus: 'synced',
}

async function getRawEntryRecord(id: string): Promise<unknown> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_ENTRIES, 'readonly').objectStore(STORE_ENTRIES).get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function putRawEntryRecord(id: string, value: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite')
    tx.objectStore(STORE_ENTRIES).put(value, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

describe('storage — LocalEntries', () => {
  beforeEach(() => {
    localStorage.clear()
    resetIdb()
  })

  it('returns empty array when nothing is stored', async () => {
    expect(await loadLocalEntries()).toEqual([])
  })

  it('round-trips an entries array', async () => {
    await saveLocalEntries([SAMPLE_ENTRY])
    const loaded = await loadLocalEntries()
    expect(loaded).toEqual([SAMPLE_ENTRY])
  })

  it('round-trips multiple entries', async () => {
    const entries: MoodEntry[] = [
      SAMPLE_ENTRY,
      { ...SAMPLE_ENTRY, id: 'entry-2', date: '2026-05-25', level2: null, note: null },
    ]
    await saveLocalEntries(entries)
    const loaded = await loadLocalEntries()
    // IDB getAll() doesn't guarantee insertion order, so compare as sets-by-id.
    expect(loaded).toHaveLength(2)
    expect(new Map(loaded.map((e) => [e.id, e]))).toEqual(new Map(entries.map((e) => [e.id, e])))
  })

  it('stores each entry as its own encrypted IDB record (not plaintext)', async () => {
    await saveLocalEntries([SAMPLE_ENTRY])
    const raw = (await getRawEntryRecord('entry-1')) as string
    expect(typeof raw).toBe('string')
    expect(raw).not.toContain('Happy')
    expect(raw).not.toContain('Great day')
  })

  it('replaces the full set on save (removed entries are not retained)', async () => {
    await saveLocalEntries([
      SAMPLE_ENTRY,
      { ...SAMPLE_ENTRY, id: 'entry-2', date: '2026-05-25' },
    ])
    await saveLocalEntries([SAMPLE_ENTRY])
    const loaded = await loadLocalEntries()
    expect(loaded.map((e) => e.id)).toEqual(['entry-1'])
  })

  it('returns empty array for corrupt stored data', async () => {
    await putRawEntryRecord('entry-1', 'not-valid-base64!!!!')
    expect(await loadLocalEntries()).toEqual([])
  })

  it('clearLocalEntries removes stored entries', async () => {
    await saveLocalEntries([SAMPLE_ENTRY])
    await clearLocalEntries()
    expect(await loadLocalEntries()).toEqual([])
  })

  it('migrates entries without syncStatus to pending', async () => {
    const legacy = { ...SAMPLE_ENTRY }
    // @ts-expect-error intentionally removing the field to simulate legacy data
    delete legacy.syncStatus
    const encrypted = await encryptString(JSON.stringify(legacy))
    await putRawEntryRecord('entry-1', encrypted)
    const loaded = await loadLocalEntries()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].syncStatus).toBe('pending')
  })
})

describe('storage — Tombstones', () => {
  beforeEach(() => {
    localStorage.clear()
    resetIdb()
  })

  it('returns empty array when none are stored', async () => {
    expect(await loadTombstones()).toEqual([])
  })

  it('round-trips tombstone ids', async () => {
    await saveTombstones(['a', 'b'])
    expect((await loadTombstones()).sort()).toEqual(['a', 'b'])
  })

  it('deduplicates ids on save', async () => {
    await saveTombstones(['a', 'a', 'b'])
    expect((await loadTombstones()).sort()).toEqual(['a', 'b'])
  })

  it('replaces the full set on save', async () => {
    await saveTombstones(['a', 'b'])
    await saveTombstones(['c'])
    expect(await loadTombstones()).toEqual(['c'])
  })
})
