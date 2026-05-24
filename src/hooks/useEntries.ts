import { useCallback, useEffect } from 'react'
import { useEntriesContext } from '@/context/EntriesContext'
import { useAuth } from '@/context/AuthContext'
import { createMoodEntry, moodEntryFieldsSchema } from '@/models/moodEntry'
import { readEntries, appendEntry } from '@/services/googleSheets'
import { loadSheetRef } from '@/lib/storage'
import type { MoodEntryFields } from '@/models/moodEntry'

function mapApiError(status: number, spreadsheetId: string): string {
  if (status === 401) return 'Session expired — Reconnect'
  if (status === 404)
    return `Spreadsheet not found — reconnect or create a new one (ID: ${spreadsheetId})`
  if (status === 429) return 'Storage quota exceeded — try again later'
  return `Unexpected error (${status}). Please try again.`
}

export function useEntries() {
  const { state, dispatch } = useEntriesContext()
  const { state: authState } = useAuth()

  useEffect(() => {
    if (authState.status !== 'authorised' || !authState.accessToken) return

    const spreadsheetId = loadSheetRef()?.id ?? null
    if (!spreadsheetId) return

    const controller = new AbortController()
    dispatch({ type: 'SET_LOADING' })

    readEntries(spreadsheetId, authState.accessToken, controller.signal)
      .then((entries) => dispatch({ type: 'SET_ENTRIES', payload: entries }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Failed to load entries'
        dispatch({ type: 'SET_ERROR', payload: msg })
      })

    return () => controller.abort()
  }, [authState.status, authState.accessToken, dispatch])

  const addEntry = useCallback(
    async (fields: MoodEntryFields) => {
      const validation = moodEntryFieldsSchema.safeParse(fields)
      if (!validation.success) return

      const entry = createMoodEntry(fields)
      const accessToken = authState.accessToken
      const spreadsheetId = loadSheetRef()?.id ?? null

      if (!accessToken || !spreadsheetId) {
        dispatch({ type: 'APPEND_ENTRY', payload: entry })
        return
      }

      dispatch({ type: 'SET_SAVING' })
      try {
        await appendEntry(spreadsheetId, accessToken, entry)
        dispatch({ type: 'APPEND_ENTRY', payload: entry })
      } catch (err: unknown) {
        let message = 'Failed to save entry. Please try again.'
        if (err instanceof Response) {
          message = mapApiError(err.status, spreadsheetId)
        } else if (err instanceof Error) {
          message = err.message
        }
        dispatch({ type: 'SET_ERROR', payload: message })
      }
    },
    [authState.accessToken, dispatch]
  )

  return {
    entries: state.items,
    status: state.status,
    error: state.error,
    addEntry,
  }
}
