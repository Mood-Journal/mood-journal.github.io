import type { MoodEntry } from '@/models/moodEntry'
import { EMOTIONS, resolveColor } from '@/data/emotions'

export interface MoodTrendChart {
  // One row per date: { date, [level1]: count, ... }, sorted oldest-first.
  data: Array<Record<string, string | number>>
  // BarChart series, limited to emotions actually logged, in canonical
  // emotion order and coloured to match the mood-picker buttons.
  series: Array<{ name: string; color: string }>
}

export function aggregateMoodTrend(entries: MoodEntry[]): MoodTrendChart {
  const countsByDate = new Map<string, Record<string, number>>()
  const present = new Set<string>()

  for (const entry of entries) {
    const counts = countsByDate.get(entry.date) ?? {}
    counts[entry.level1] = (counts[entry.level1] ?? 0) + 1
    countsByDate.set(entry.date, counts)
    present.add(entry.level1)
  }

  // Date strings are YYYY-MM-DD, so lexicographic sort is chronological.
  const data = [...countsByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }))

  const series = EMOTIONS.filter((root) => present.has(root.label)).map((root) => ({
    name: root.label,
    color: `${resolveColor(root.label)}.6`,
  }))

  return { data, series }
}
