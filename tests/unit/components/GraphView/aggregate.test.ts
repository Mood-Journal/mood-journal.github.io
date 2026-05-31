import { describe, it, expect } from 'vitest'
import { aggregateMoodTrend } from '../../../../src/components/GraphView/aggregate'
import type { MoodEntry } from '../../../../src/models/moodEntry'

function entry(overrides: Partial<MoodEntry> & { id: string }): MoodEntry {
  return {
    date: '2026-05-27',
    level1: 'Happy',
    level2: null,
    level3: null,
    note: null,
    createdAt: '2026-05-27T10:00:00.000Z',
    syncStatus: 'synced',
    ...overrides,
  }
}

describe('aggregateMoodTrend', () => {
  it('returns empty data and series for no entries', () => {
    expect(aggregateMoodTrend([])).toEqual({ data: [], series: [] })
  })

  it('counts level1 emotions per date', () => {
    const result = aggregateMoodTrend([
      entry({ id: 'a', date: '2026-05-27', level1: 'Happy' }),
      entry({ id: 'b', date: '2026-05-27', level1: 'Happy' }),
      entry({ id: 'c', date: '2026-05-27', level1: 'Sad' }),
    ])
    expect(result.data).toEqual([{ date: '2026-05-27', Happy: 2, Sad: 1 }])
  })

  it('sorts dates chronologically regardless of input order', () => {
    const result = aggregateMoodTrend([
      entry({ id: 'a', date: '2026-05-29' }),
      entry({ id: 'b', date: '2026-05-27' }),
      entry({ id: 'c', date: '2026-05-28' }),
    ])
    expect(result.data.map((row) => row.date)).toEqual([
      '2026-05-27',
      '2026-05-28',
      '2026-05-29',
    ])
  })

  it('emits series only for logged emotions, in canonical order with picker colours', () => {
    const result = aggregateMoodTrend([
      entry({ id: 'a', level1: 'Happy' }),
      entry({ id: 'b', level1: 'Angry' }),
    ])
    // Angry precedes Happy in the emotion tree, and colours match the buttons.
    expect(result.series).toEqual([
      { name: 'Angry', color: 'red.6' },
      { name: 'Happy', color: 'yellow.6' },
    ])
  })
})
