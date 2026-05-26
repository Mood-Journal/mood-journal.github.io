import { useCallback, useEffect } from 'react'
import { useEntriesContext } from '@/context/EntriesContext'
import { useAuth } from '@/context/AuthContext'
import { createMoodEntry, moodEntryFieldsSchema } from '@/models/moodEntry'
import { readEntries, appendEntry } from '@/services/googleSheets'
import { loadSheetRef, loadLocalEntries, saveLocalEntries } from '@/lib/storage'
import type { MoodEntryFields, MoodEntry } from '@/models/moodEntry'

function mapApiError(status: number, spreadsheetId: string): string {
  if (status === 401) return 'Session expired — Reconnect'
  if (status === 404)
    return `Spreadsheet not found — reconnect or create a new one (ID: ${spreadsheetId})`
  if (status === 429) return 'Storage quota exceeded — try again later'
  return `Unexpected error (${status}). Please try again.`
}

function mergeById(primary: MoodEntry[], secondary: MoodEntry[]): MoodEntry[] {
  const seen = new Set(primary.map((e) => e.id))
  const merged = [...primary, ...secondary.filter((e) => !seen.has(e.id))]
  return merged.sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  )
}

export function useEntries() {
  const { state, dispatch } = useEntriesContext()
  const { state: authState } = useAuth()

  // Background sync with Sheets when auth'd and a sheet is configured
  useEffect(() => {
    if (authState.status !== 'authorised' || !authState.accessToken) return
    const spreadsheetId = loadSheetRef()?.id ?? null
    if (!spreadsheetId) return

    const controller = new AbortController()

    readEntries(spreadsheetId, authState.accessToken, controller.signal)
      .then(async (sheetsEntries) => {
        const localEntries = await loadLocalEntries()
        const sheetsIds = new Set(sheetsEntries.map((e) => e.id))
        const localOnly = localEntries.filter((e) => !sheetsIds.has(e.id))

        // push any local-only (offline) entries up to Sheets
        const token = authState.accessToken
        if (localOnly.length > 0 && token) {
          await Promise.allSettled(
            localOnly.map((e) => appendEntry(spreadsheetId, token, e))
          )
        }

        const merged = mergeById(sheetsEntries, localOnly)
        await saveLocalEntries(merged)
        dispatch({ type: 'SET_ENTRIES', payload: merged })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Failed to sync with Drive'
        dispatch({ type: 'SET_ERROR', payload: msg })
      })

    return () => controller.abort()
  }, [authState.status, authState.accessToken, dispatch])

  const addEntry = useCallback(
    async (fields: MoodEntryFields) => {
      const validation = moodEntryFieldsSchema.safeParse(fields)
      if (!validation.success) return

      const entry = createMoodEntry(fields)
      // newItems mirrors what APPEND_ENTRY does in the reducer
      const newItems = [entry, ...state.items]

      dispatch({ type: 'APPEND_ENTRY', payload: entry })
      await saveLocalEntries(newItems)

      const accessToken = authState.accessToken
      const spreadsheetId = loadSheetRef()?.id ?? null
      if (!accessToken || !spreadsheetId) return

      dispatch({ type: 'SET_SAVING' })
      try {
        await appendEntry(spreadsheetId, accessToken, entry)
        dispatch({ type: 'SET_ENTRIES', payload: newItems })
      } catch (err: unknown) {
        let message = 'Saved locally. Could not sync to Drive — try again later.'
        if (err instanceof Response) {
          message = mapApiError(err.status, spreadsheetId)
        } else if (err instanceof Error) {
          message = err.message
        }
        dispatch({ type: 'SET_ERROR', payload: message })
      }
    },
    [authState.accessToken, dispatch, state.items]
  )

  return {
    entries: state.items,
    status: state.status,
    error: state.error,
    addEntry,
  }
}
