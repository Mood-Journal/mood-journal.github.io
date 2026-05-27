import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MoodEntry } from '../../../src/models/moodEntry'

const h = vi.hoisted(() => {
  let store: MoodEntry[] = []
  return {
    getStore: () => store,
    setStore: (next: MoodEntry[]) => {
      store = next
    },
    loadLocalEntries: vi.fn(),
    saveLocalEntries: vi.fn(),
    readEntries: vi.fn(),
    appendEntry: vi.fn(),
    sheetsUpdateEntry: vi.fn(),
    sheetsDeleteEntry: vi.fn(),
  }
})

vi.mock('@/lib/storage', () => ({
  loadLocalEntries: h.loadLocalEntries,
  saveLocalEntries: h.saveLocalEntries,
}))

vi.mock('@/services/googleSheets', () => ({
  readEntries: h.readEntries,
  appendEntry: h.appendEntry,
  updateEntry: h.sheetsUpdateEntry,
  deleteEntry: h.sheetsDeleteEntry,
}))

import * as engine from '@/services/syncEngine'

function entry(overrides: Partial<MoodEntry> & { id: string }): MoodEntry {
  return {
    date: '2026-05-27',
    level1: 'Happy',
    level2: null,
    level3: null,
    note: null,
    createdAt: '2026-05-27T10:00:00.000Z',
    syncStatus: 'pending',
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

const SHEET = 'sheet-1'
const TOKEN = 'token-1'

beforeEach(() => {
  vi.resetAllMocks()
  h.setStore([])
  h.loadLocalEntries.mockImplementation(async () => [...h.getStore()])
  h.saveLocalEntries.mockImplementation(async (next: MoodEntry[]) => h.setStore(next))
  h.readEntries.mockResolvedValue([])
  h.appendEntry.mockResolvedValue(undefined)
  h.sheetsUpdateEntry.mockResolvedValue(undefined)
  h.sheetsDeleteEntry.mockResolvedValue(undefined)
})

describe('runSync single-flight', () => {
  it('coalesces concurrent calls into one network read', async () => {
    const [a, b] = await Promise.all([
      engine.runSync(SHEET, TOKEN),
      engine.runSync(SHEET, TOKEN),
    ])
    expect(h.readEntries).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('appends a local pending entry at most once across concurrent syncs', async () => {
    h.setStore([entry({ id: 'a', syncStatus: 'pending' })])
    await Promise.all([engine.runSync(SHEET, TOKEN), engine.runSync(SHEET, TOKEN)])
    expect(h.appendEntry).toHaveBeenCalledTimes(1)
    expect(h.getStore().find((e) => e.id === 'a')?.syncStatus).toBe('synced')
  })

  it('collapses duplicate sheet rows to one entry on read', async () => {
    h.readEntries.mockResolvedValue([
      entry({ id: 'a', syncStatus: 'synced', createdAt: '2026-05-27T08:00:00.000Z' }),
      entry({ id: 'a', syncStatus: 'synced', createdAt: '2026-05-27T12:00:00.000Z' }),
    ])
    const merged = await engine.runSync(SHEET, TOKEN)
    expect(merged.filter((e) => e.id === 'a')).toHaveLength(1)
  })
})

describe('addEntry / runSync race', () => {
  it('excludes an in-flight addEntry id from a concurrent reconcile push', async () => {
    const append = deferred<void>()
    h.appendEntry.mockReturnValueOnce(append.promise) // addEntry's push hangs

    const addP = engine.addEntry(entry({ id: 'a', syncStatus: 'pending' }), SHEET, TOKEN)
    await flush() // let addEntry persist 'a' and reach the hanging append

    await engine.runSync(SHEET, TOKEN)
    expect(h.appendEntry).toHaveBeenCalledTimes(1) // reconcile did not re-push 'a'

    append.resolve()
    await addP
  })
})

describe('addEntry', () => {
  it('marks the entry synced and persists it on a successful push', async () => {
    const res = await engine.addEntry(entry({ id: 'a', syncStatus: 'pending' }), SHEET, TOKEN)
    expect(res.error).toBeNull()
    expect(res.entries).toHaveLength(1)
    expect(res.entries[0].syncStatus).toBe('synced')
    expect(h.getStore()[0].syncStatus).toBe('synced')
  })

  it('returns a mapped error and keeps the entry pending when the push fails', async () => {
    h.appendEntry.mockRejectedValue(new Error('Sheets API error: 500'))
    const res = await engine.addEntry(entry({ id: 'a', syncStatus: 'pending' }), SHEET, TOKEN)
    expect(res.error).toBe('Sheets API error: 500')
    expect(res.entries[0].syncStatus).toBe('pending')
    expect(h.getStore()[0].syncStatus).toBe('pending')
  })

  it('persists locally without pushing when there are no credentials', async () => {
    const res = await engine.addEntry(entry({ id: 'a' }), null, null)
    expect(res.error).toBeNull()
    expect(res.entries).toHaveLength(1)
    expect(h.appendEntry).not.toHaveBeenCalled()
  })
})

describe('updateEntry', () => {
  it('does not push when the entry is still pending', async () => {
    h.setStore([entry({ id: 'a', syncStatus: 'pending' })])
    const res = await engine.updateEntry(
      entry({ id: 'a', syncStatus: 'pending', note: 'edited' }),
      SHEET,
      TOKEN
    )
    expect(res.error).toBeNull()
    expect(h.sheetsUpdateEntry).not.toHaveBeenCalled()
    expect(h.getStore()[0].note).toBe('edited')
  })

  it('surfaces a mapped error when a synced push fails', async () => {
    h.setStore([entry({ id: 'a', syncStatus: 'synced' })])
    h.sheetsUpdateEntry.mockRejectedValue(new Error('Sheets API error: 500'))
    const res = await engine.updateEntry(
      entry({ id: 'a', syncStatus: 'synced', note: 'edited' }),
      SHEET,
      TOKEN
    )
    expect(res.error).toBe('Sheets API error: 500')
    expect(h.getStore()[0].note).toBe('edited')
  })
})

describe('deleteEntry', () => {
  it('removes a synced entry locally and deletes it from the sheet', async () => {
    h.setStore([entry({ id: 'a', syncStatus: 'synced' }), entry({ id: 'b', syncStatus: 'synced' })])
    const res = await engine.deleteEntry('a', SHEET, TOKEN)
    expect(res.entries.map((e) => e.id)).toEqual(['b'])
    expect(h.sheetsDeleteEntry).toHaveBeenCalledWith(SHEET, TOKEN, 'a')
  })

  it('skips the sheet delete for a pending entry', async () => {
    h.setStore([entry({ id: 'a', syncStatus: 'pending' })])
    const res = await engine.deleteEntry('a', SHEET, TOKEN)
    expect(res.entries).toHaveLength(0)
    expect(h.sheetsDeleteEntry).not.toHaveBeenCalled()
  })
})

describe('mapApiError', () => {
  it('maps known statuses to actionable messages', () => {
    expect(engine.mapApiError(401, 'x')).toBe('Session expired — Reconnect')
    expect(engine.mapApiError(404, 'sheet-9')).toContain('sheet-9')
    expect(engine.mapApiError(429, 'x')).toContain('quota')
    expect(engine.mapApiError(500, 'x')).toContain('Unexpected error (500)')
  })
})
