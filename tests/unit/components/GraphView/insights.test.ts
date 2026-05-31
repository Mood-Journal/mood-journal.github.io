import { describe, it, expect } from 'vitest'
import { computeMoodInsights } from '../../../../src/components/GraphView/insights'
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

describe('computeMoodInsights', () => {
  it('returns no insights for no entries', () => {
    expect(computeMoodInsights([])).toEqual([])
  })

  it('names the most logged feeling with its count and percentage', () => {
    const insights = computeMoodInsights([
      entry({ id: 'a', level1: 'Happy' }),
      entry({ id: 'b', level1: 'Happy' }),
      entry({ id: 'c', level1: 'Sad' }),
    ])
    expect(insights[0]).toBe('Happy was your most logged feeling — 2 of 3 entries (67%).')
  })

  it('breaks frequency ties by canonical emotion order', () => {
    // Angry and Happy both appear once; Angry precedes Happy in the tree.
    const insights = computeMoodInsights([
      entry({ id: 'a', level1: 'Happy' }),
      entry({ id: 'b', level1: 'Angry' }),
    ])
    expect(insights[0]).toContain('Angry was your most logged feeling')
  })

  it('summarises total entries, distinct days, and distinct feelings', () => {
    const insights = computeMoodInsights([
      entry({ id: 'a', date: '2026-05-27', level1: 'Happy' }),
      entry({ id: 'b', date: '2026-05-27', level1: 'Sad' }),
      entry({ id: 'c', date: '2026-05-28', level1: 'Happy' }),
    ])
    expect(insights[1]).toBe(
      "You've logged 3 entries across 2 days, covering 2 different feelings."
    )
  })

  it('uses singular wording for a single entry, day, and feeling', () => {
    const insights = computeMoodInsights([entry({ id: 'a' })])
    expect(insights[0]).toBe('Happy was your most logged feeling — 1 of 1 entry (100%).')
    expect(insights[1]).toBe("You've logged 1 entry across 1 day, covering 1 different feeling.")
  })

  it('surfaces a shift when the dominant feeling changes across the tracked span', () => {
    const insights = computeMoodInsights([
      entry({ id: 'a', date: '2026-05-01', level1: 'Sad' }),
      entry({ id: 'b', date: '2026-05-02', level1: 'Sad' }),
      entry({ id: 'c', date: '2026-05-03', level1: 'Happy' }),
      entry({ id: 'd', date: '2026-05-04', level1: 'Happy' }),
    ])
    expect(insights).toContain("Lately you're feeling more Happy and less Sad than before.")
  })

  it('omits the shift insight with fewer than four distinct days', () => {
    const insights = computeMoodInsights([
      entry({ id: 'a', date: '2026-05-01', level1: 'Sad' }),
      entry({ id: 'b', date: '2026-05-02', level1: 'Happy' }),
      entry({ id: 'c', date: '2026-05-03', level1: 'Happy' }),
    ])
    expect(insights.some((i) => i.startsWith("Lately you're feeling"))).toBe(false)
  })

  it('notes a steady mood when the dominant feeling is unchanged across the span', () => {
    const insights = computeMoodInsights([
      entry({ id: 'a', date: '2026-05-01', level1: 'Happy' }),
      entry({ id: 'b', date: '2026-05-02', level1: 'Happy' }),
      entry({ id: 'c', date: '2026-05-03', level1: 'Happy' }),
      entry({ id: 'd', date: '2026-05-04', level1: 'Happy' }),
      entry({ id: 'e', date: '2026-05-04', level1: 'Sad' }),
    ])
    expect(insights.some((i) => i.startsWith("Lately you're feeling"))).toBe(false)
    expect(insights).toContain(
      'Your mood has held steady — Happy stayed your most common feeling throughout.'
    )
  })
})
