import type { MoodEntry } from '@/models/moodEntry'

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
