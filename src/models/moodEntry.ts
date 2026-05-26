import { z } from 'zod'

export interface MoodEntry {
  id: string
  date: string
  level1: string
  level2: string | null
  level3: string | null
  note: string | null
  createdAt: string
  // local-only: not written to Google Sheets
  syncStatus: 'pending' | 'synced'
}

export const moodEntryFieldsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  level1: z.string().min(1, 'An emotion is required'),
  level2: z.string().optional(),
  level3: z.string().optional(),
  note: z.string().max(500, 'Note must be 500 characters or fewer').optional(),
})

export type MoodEntryFields = z.infer<typeof moodEntryFieldsSchema>

export function createMoodEntry(fields: MoodEntryFields): MoodEntry {
  return {
    id: crypto.randomUUID(),
    date: fields.date,
    level1: fields.level1,
    level2: fields.level2 ?? null,
    level3: fields.level3 ?? null,
    note: fields.note ?? null,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
  }
}

export function rowToMoodEntry(row: string[]): MoodEntry {
  return {
    id: row[0] ?? '',
    date: row[1] ?? '',
    level1: row[2] ?? '',
    level2: row[3] || null,
    level3: row[4] || null,
    note: row[5] || null,
    createdAt: row[6] ?? '',
    syncStatus: 'synced',
  }
}

export function moodEntryToRow(entry: MoodEntry): string[] {
  return [
    entry.id,
    entry.date,
    entry.level1,
    entry.level2 ?? '',
    entry.level3 ?? '',
    entry.note ?? '',
    entry.createdAt,
  ]
}

export function deepestLabel(entry: MoodEntry): string {
  return entry.level3 ?? entry.level2 ?? entry.level1
}

export function breadcrumb(entry: MoodEntry): string {
  const parts = [entry.level1, entry.level2, entry.level3].filter(
    (p): p is string => p !== null
  )
  return parts.join(' › ')
}
