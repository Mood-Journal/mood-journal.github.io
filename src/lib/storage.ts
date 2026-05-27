import { encryptString, decryptString } from './crypto'
import type { MoodEntry } from '@/models/moodEntry'

const SHEET_REF_KEY = 'mood-journal-spreadsheet:v1'
const ENTRIES_KEY = 'mood-journal-entries:v1'

export interface SheetRef {
  id: string
  title: string
}

export function loadSheetRef(): SheetRef | null {
  try {
    const raw = localStorage.getItem(SHEET_REF_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as SheetRef).id === 'string' &&
      typeof (parsed as SheetRef).title === 'string'
    ) {
      return parsed as SheetRef
    }
    return null
  } catch {
    return null
  }
}

export function saveSheetRef(ref: SheetRef): void {
  localStorage.setItem(SHEET_REF_KEY, JSON.stringify(ref))
}

export function clearSheetRef(): void {
  localStorage.removeItem(SHEET_REF_KEY)
}

export async function loadLocalEntries(): Promise<MoodEntry[]> {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    if (!raw) return []
    const decrypted = await decryptString(raw)
    const parsed = JSON.parse(decrypted) as unknown
    if (!Array.isArray(parsed)) return []
    // Entries written before syncStatus was introduced default to 'pending' so
    // the next sync can reconcile them against Sheets rather than silently drop them.
    return (parsed as Array<Partial<MoodEntry> & Omit<MoodEntry, 'syncStatus'>>).map(
      (entry) => ({ ...entry, syncStatus: entry.syncStatus ?? 'pending' }) as MoodEntry
    )
  } catch {
    return []
  }
}

export async function saveLocalEntries(entries: MoodEntry[]): Promise<void> {
  try {
    const encrypted = await encryptString(JSON.stringify(entries))
    localStorage.setItem(ENTRIES_KEY, encrypted)
  } catch {
    // Encryption failure should not crash the app — data is still in memory
  }
}

export function clearLocalEntries(): void {
  localStorage.removeItem(ENTRIES_KEY)
}
