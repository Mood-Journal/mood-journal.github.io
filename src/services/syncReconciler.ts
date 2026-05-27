import type { MoodEntry } from '@/models/moodEntry'

// Collapse entries sharing an id to a single entry, keeping the earliest
// createdAt (the original write). Defends against duplicate rows that a
// non-idempotent Sheets append may have created in the past.
export function dedupeById(entries: MoodEntry[]): MoodEntry[] {
  const byId = new Map<string, MoodEntry>()
  for (const entry of entries) {
    const existing = byId.get(entry.id)
    if (!existing || entry.createdAt < existing.createdAt) {
      byId.set(entry.id, entry)
    }
  }
  return [...byId.values()]
}

function mergeById(primary: MoodEntry[], secondary: MoodEntry[]): MoodEntry[] {
  const seen = new Set(primary.map((e) => e.id))
  const merged = [...primary, ...secondary.filter((e) => !seen.has(e.id))]
  return merged.sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  )
}

export function getPendingToSync(
  localEntries: MoodEntry[],
  sheetsIds: Set<string>,
  inFlightIds: Set<string>
): MoodEntry[] {
  return localEntries.filter(
    (e) => e.syncStatus !== 'synced' && !sheetsIds.has(e.id) && !inFlightIds.has(e.id)
  )
}

export function buildMergedEntries(
  sheetsEntries: MoodEntry[],
  justSynced: MoodEntry[],
  retainLocal: MoodEntry[]
): MoodEntry[] {
  return mergeById(sheetsEntries, [...justSynced, ...retainLocal])
}
