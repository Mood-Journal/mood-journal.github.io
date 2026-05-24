import { describe, it, expect } from 'vitest'
import {
  createMoodEntry,
  moodEntryFieldsSchema,
  rowToMoodEntry,
  moodEntryToRow,
  deepestLabel,
  breadcrumb,
} from '../../../src/models/moodEntry'
import type { MoodEntry } from '../../../src/models/moodEntry'

describe('createMoodEntry', () => {
  const base = { date: '2026-05-24', level1: 'Happy' }

  it('generates a UUID v4 id', () => {
    const entry = createMoodEntry(base)
    expect(entry.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('generates an ISO datetime createdAt', () => {
    const before = new Date().toISOString()
    const entry = createMoodEntry(base)
    const after = new Date().toISOString()
    expect(entry.createdAt >= before).toBe(true)
    expect(entry.createdAt <= after).toBe(true)
  })

  it('merges provided fields', () => {
    const entry = createMoodEntry({
      date: '2026-05-24',
      level1: 'Fearful',
      level2: 'Insecure',
      level3: 'Inferior',
      note: 'A bad day',
    })
    expect(entry.level1).toBe('Fearful')
    expect(entry.level2).toBe('Insecure')
    expect(entry.level3).toBe('Inferior')
    expect(entry.note).toBe('A bad day')
    expect(entry.date).toBe('2026-05-24')
  })

  it('defaults level2, level3, and note to null when not provided', () => {
    const entry = createMoodEntry(base)
    expect(entry.level2).toBeNull()
    expect(entry.level3).toBeNull()
    expect(entry.note).toBeNull()
  })
})

describe('moodEntryFieldsSchema', () => {
  const base = { date: '2026-05-24', level1: 'Happy' }

  it('accepts a minimal valid entry', () => {
    expect(moodEntryFieldsSchema.safeParse(base).success).toBe(true)
  })

  it('accepts a fully populated entry', () => {
    const result = moodEntryFieldsSchema.safeParse({
      ...base,
      level2: 'Content',
      level3: 'Joyful',
      note: 'Great day',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing level1', () => {
    const result = moodEntryFieldsSchema.safeParse({ date: '2026-05-24' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty level1', () => {
    const result = moodEntryFieldsSchema.safeParse({ ...base, level1: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a note longer than 500 characters', () => {
    const result = moodEntryFieldsSchema.safeParse({ ...base, note: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts a note of exactly 500 characters', () => {
    const result = moodEntryFieldsSchema.safeParse({ ...base, note: 'a'.repeat(500) })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid date format', () => {
    expect(moodEntryFieldsSchema.safeParse({ ...base, date: '24-05-2026' }).success).toBe(false)
    expect(moodEntryFieldsSchema.safeParse({ ...base, date: 'not-a-date' }).success).toBe(false)
  })

  it('accepts YYYY-MM-DD date format', () => {
    expect(moodEntryFieldsSchema.safeParse({ ...base, date: '2026-05-24' }).success).toBe(true)
  })
})

describe('rowToMoodEntry', () => {
  it('maps a full 7-element row to a MoodEntry', () => {
    const row = ['id-1', '2026-05-24', 'Fearful', 'Insecure', 'Inferior', 'Note', '2026-05-24T10:00:00.000Z']
    const entry = rowToMoodEntry(row)
    expect(entry.id).toBe('id-1')
    expect(entry.date).toBe('2026-05-24')
    expect(entry.level1).toBe('Fearful')
    expect(entry.level2).toBe('Insecure')
    expect(entry.level3).toBe('Inferior')
    expect(entry.note).toBe('Note')
    expect(entry.createdAt).toBe('2026-05-24T10:00:00.000Z')
  })

  it('coerces empty strings to null for optional fields', () => {
    const row = ['id-1', '2026-05-24', 'Happy', '', '', '', '2026-05-24T10:00:00.000Z']
    const entry = rowToMoodEntry(row)
    expect(entry.level2).toBeNull()
    expect(entry.level3).toBeNull()
    expect(entry.note).toBeNull()
  })
})

describe('moodEntryToRow', () => {
  it('maps a MoodEntry to a 7-element row', () => {
    const entry: MoodEntry = {
      id: 'id-1',
      date: '2026-05-24',
      level1: 'Happy',
      level2: 'Content',
      level3: 'Joyful',
      note: 'Great day',
      createdAt: '2026-05-24T10:00:00.000Z',
    }
    expect(moodEntryToRow(entry)).toEqual([
      'id-1', '2026-05-24', 'Happy', 'Content', 'Joyful', 'Great day', '2026-05-24T10:00:00.000Z',
    ])
  })

  it('maps null optional fields to empty strings', () => {
    const entry: MoodEntry = {
      id: 'id-1',
      date: '2026-05-24',
      level1: 'Happy',
      level2: null,
      level3: null,
      note: null,
      createdAt: '2026-05-24T10:00:00.000Z',
    }
    const row = moodEntryToRow(entry)
    expect(row[3]).toBe('')
    expect(row[4]).toBe('')
    expect(row[5]).toBe('')
    expect(row).toHaveLength(7)
  })
})

describe('deepestLabel', () => {
  it('returns level3 when present', () => {
    const entry: MoodEntry = { id: '', date: '', level1: 'Fearful', level2: 'Insecure', level3: 'Inferior', note: null, createdAt: '' }
    expect(deepestLabel(entry)).toBe('Inferior')
  })

  it('falls back to level2 when level3 is null', () => {
    const entry: MoodEntry = { id: '', date: '', level1: 'Fearful', level2: 'Insecure', level3: null, note: null, createdAt: '' }
    expect(deepestLabel(entry)).toBe('Insecure')
  })

  it('falls back to level1 when level2 and level3 are null', () => {
    const entry: MoodEntry = { id: '', date: '', level1: 'Happy', level2: null, level3: null, note: null, createdAt: '' }
    expect(deepestLabel(entry)).toBe('Happy')
  })
})

describe('breadcrumb', () => {
  it('joins non-null levels with › separator', () => {
    const entry: MoodEntry = { id: '', date: '', level1: 'Fearful', level2: 'Insecure', level3: 'Inferior', note: null, createdAt: '' }
    expect(breadcrumb(entry)).toBe('Fearful › Insecure › Inferior')
  })

  it('omits null levels', () => {
    const entry: MoodEntry = { id: '', date: '', level1: 'Happy', level2: 'Content', level3: null, note: null, createdAt: '' }
    expect(breadcrumb(entry)).toBe('Happy › Content')
  })

  it('returns just level1 when others are null', () => {
    const entry: MoodEntry = { id: '', date: '', level1: 'Bad', level2: null, level3: null, note: null, createdAt: '' }
    expect(breadcrumb(entry)).toBe('Bad')
  })
})
