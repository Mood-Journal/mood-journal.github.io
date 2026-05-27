import { describe, it, expect } from 'vitest'
import { getPendingToSync, buildMergedEntries } from '../../../src/services/syncReconciler'
import type { MoodEntry } from '../../../src/models/moodEntry'

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

describe('getPendingToSync', () => {
  it('returns pending entries absent from Sheets and not in-flight', () => {
    const local = [entry({ id: 'a' }), entry({ id: 'b' })]
    const result = getPendingToSync(local, new Set(), new Set())
    expect(result.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('excludes synced entries', () => {
    const local = [entry({ id: 'a', syncStatus: 'synced' }), entry({ id: 'b' })]
    const result = getPendingToSync(local, new Set(), new Set())
    expect(result.map((e) => e.id)).toEqual(['b'])
  })

  it('excludes entries already in Sheets', () => {
    const local = [entry({ id: 'a' }), entry({ id: 'b' })]
    const result = getPendingToSync(local, new Set(['a']), new Set())
    expect(result.map((e) => e.id)).toEqual(['b'])
  })

  it('excludes in-flight entries', () => {
    const local = [entry({ id: 'a' }), entry({ id: 'b' })]
    const result = getPendingToSync(local, new Set(), new Set(['a']))
    expect(result.map((e) => e.id)).toEqual(['b'])
  })

  it('returns empty array when no entries qualify', () => {
    const local = [
      entry({ id: 'a', syncStatus: 'synced' }),
      entry({ id: 'b' }), // in Sheets
      entry({ id: 'c' }), // in-flight
    ]
    const result = getPendingToSync(local, new Set(['b']), new Set(['c']))
    expect(result).toEqual([])
  })
})

describe('buildMergedEntries', () => {
  it('includes entries from sheetsEntries', () => {
    const sheets = [entry({ id: 'a', syncStatus: 'synced' })]
    const result = buildMergedEntries(sheets, [], [])
    expect(result.map((e) => e.id)).toEqual(['a'])
  })

  it('includes justSynced entries marked synced (regression: Bug 1 — pushed entries must not vanish)', () => {
    const justSynced = [entry({ id: 'b', syncStatus: 'synced' })]
    const result = buildMergedEntries([], justSynced, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b')
    expect(result[0].syncStatus).toBe('synced')
  })

  it('includes retainLocal entries still pending', () => {
    const retainLocal = [entry({ id: 'c', syncStatus: 'pending' })]
    const result = buildMergedEntries([], [], retainLocal)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c')
    expect(result[0].syncStatus).toBe('pending')
  })

  it('sheetsEntries wins on ID collision with justSynced', () => {
    const sheetsVersion = entry({ id: 'a', syncStatus: 'synced', note: 'from sheets' })
    const localVersion = entry({ id: 'a', syncStatus: 'synced', note: 'local copy' })
    const result = buildMergedEntries([sheetsVersion], [localVersion], [])
    expect(result).toHaveLength(1)
    expect(result[0].note).toBe('from sheets')
  })

  it('returns entries from all three sources in a single deduplicated list', () => {
    const sheets = [entry({ id: 'a', syncStatus: 'synced' })]
    const justSynced = [entry({ id: 'b', syncStatus: 'synced' })]
    const retainLocal = [entry({ id: 'c', syncStatus: 'pending' })]
    const result = buildMergedEntries(sheets, justSynced, retainLocal)
    expect(result.map((e) => e.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('sorts descending by date', () => {
    const sheets = [
      entry({ id: 'a', date: '2026-05-25', syncStatus: 'synced' }),
      entry({ id: 'b', date: '2026-05-27', syncStatus: 'synced' }),
    ]
    const result = buildMergedEntries(sheets, [], [])
    expect(result.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('sorts by createdAt descending when dates are equal', () => {
    const sheets = [
      entry({ id: 'a', date: '2026-05-27', createdAt: '2026-05-27T08:00:00.000Z', syncStatus: 'synced' }),
      entry({ id: 'b', date: '2026-05-27', createdAt: '2026-05-27T12:00:00.000Z', syncStatus: 'synced' }),
    ]
    const result = buildMergedEntries(sheets, [], [])
    expect(result.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('returns empty array for all-empty inputs', () => {
    expect(buildMergedEntries([], [], [])).toEqual([])
  })
})
