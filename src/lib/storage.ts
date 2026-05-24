const SHEET_REF_KEY = 'mood-journal-spreadsheet:v1'
const SESSION_HINT_KEY = 'mood-journal-session-hint:v1'

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

export interface SessionHint {
  expiresAt: number
}

export function loadSessionHint(): SessionHint | null {
  try {
    const raw = localStorage.getItem(SESSION_HINT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as SessionHint).expiresAt === 'number'
    ) {
      return parsed as SessionHint
    }
    return null
  } catch {
    return null
  }
}

export function saveSessionHint(hint: SessionHint): void {
  localStorage.setItem(SESSION_HINT_KEY, JSON.stringify(hint))
}

export function clearSessionHint(): void {
  localStorage.removeItem(SESSION_HINT_KEY)
}
