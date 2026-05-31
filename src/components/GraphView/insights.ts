import type { MoodEntry } from '@/models/moodEntry'
import { EMOTIONS } from '@/data/emotions'

// Canonical level-1 order, used to break frequency ties deterministically so
// the same entries always yield the same headline.
const EMOTION_RANK = new Map(EMOTIONS.map((root, index) => [root.label, index]))

function rank(label: string): number {
  return EMOTION_RANK.get(label) ?? EMOTION_RANK.size
}

// Most frequent label; ties broken by canonical emotion order.
function dominant(counts: Map<string, number>): string | null {
  let best: string | null = null
  let bestCount = 0
  for (const [label, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && rank(label) < rank(best))) {
      best = label
      bestCount = count
    }
  }
  return best
}

function countByLevel1(entries: MoodEntry[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    counts.set(entry.level1, (counts.get(entry.level1) ?? 0) + 1)
  }
  return counts
}

const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${n} ${n === 1 ? singular : pluralForm}`

/**
 * Plain-language observations derived from the same level-1 data the trend
 * chart plots. Returns an empty list for no entries (the caller shows the empty
 * state instead). Each string stands alone so the caller can render them as a
 * simple list.
 */
export function computeMoodInsights(entries: MoodEntry[]): string[] {
  if (entries.length === 0) return []

  const total = entries.length
  const counts = countByLevel1(entries)
  const dates = new Set(entries.map((e) => e.date))
  const insights: string[] = []

  // Dominant feeling.
  const top = dominant(counts)
  if (top) {
    const topCount = counts.get(top) ?? 0
    const pct = Math.round((topCount / total) * 100)
    insights.push(
      `${top} was your most logged feeling — ${topCount} of ${plural(total, 'entry', 'entries')} (${pct}%).`
    )
  }

  // Logging span: how much you've tracked and how widely.
  insights.push(
    `You've logged ${plural(total, 'entry', 'entries')} across ${plural(dates.size, 'day')}, covering ${plural(counts.size, 'different feeling')}.`
  )

  // Recent shift: compare the dominant feeling of the earlier vs later half of
  // the tracked days. Needs at least four distinct days for the split to be
  // meaningful rather than noise.
  const sortedDates = [...dates].sort((a, b) => a.localeCompare(b))
  if (sortedDates.length >= 4) {
    const mid = Math.floor(sortedDates.length / 2)
    const earlierDates = new Set(sortedDates.slice(0, mid))
    const earlier = entries.filter((e) => earlierDates.has(e.date))
    const later = entries.filter((e) => !earlierDates.has(e.date))
    const earlierTop = dominant(countByLevel1(earlier))
    const laterTop = dominant(countByLevel1(later))
    if (earlierTop && laterTop) {
      insights.push(
        earlierTop === laterTop
          ? `Your mood has held steady — ${laterTop} stayed your most common feeling throughout.`
          : `Lately you're feeling more ${laterTop} and less ${earlierTop} than before.`
      )
    }
  }

  return insights
}
