import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadSheetRef,
  saveSheetRef,
  clearSheetRef,
  loadSessionHint,
  saveSessionHint,
  clearSessionHint,
  loadLocalEntries,
  saveLocalEntries,
  clearLocalEntries,
} from '../../../src/lib/storage'
import { resetKeyForTesting } from '../../../src/lib/crypto'
import type { MoodEntry } from '../../../src/models/moodEntry'

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

describe('storage — SessionHint', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no hint is stored', () => {
    expect(loadSessionHint()).toBeNull()
  })

  it('round-trips a SessionHint', () => {
    const hint = { expiresAt: 1234567890 }
    saveSessionHint(hint)
    expect(loadSessionHint()).toEqual(hint)
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem('mood-journal-session-hint:v1', 'not-json{')
    expect(loadSessionHint()).toBeNull()
  })

  it('returns null when stored value is missing expiresAt', () => {
    localStorage.setItem('mood-journal-session-hint:v1', JSON.stringify({}))
    expect(loadSessionHint()).toBeNull()
  })

  it('clearSessionHint removes the stored hint', () => {
    saveSessionHint({ expiresAt: 1234567890 })
    clearSessionHint()
    expect(loadSessionHint()).toBeNull()
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
}

describe('storage — LocalEntries', () => {
  beforeEach(() => {
    localStorage.clear()
    resetKeyForTesting()
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
    expect(await loadLocalEntries()).toEqual(entries)
  })

  it('stores data as encrypted ciphertext (not plaintext JSON)', async () => {
    await saveLocalEntries([SAMPLE_ENTRY])
    const raw = localStorage.getItem('mood-journal-entries:v1')!
    expect(raw).not.toContain('entry-1')
    expect(raw).not.toContain('Happy')
  })

  it('returns empty array for corrupt stored data', async () => {
    localStorage.setItem('mood-journal-entries:v1', 'not-valid-base64!!!!')
    expect(await loadLocalEntries()).toEqual([])
  })

  it('clearLocalEntries removes stored entries', async () => {
    await saveLocalEntries([SAMPLE_ENTRY])
    clearLocalEntries()
    expect(await loadLocalEntries()).toEqual([])
  })
})
