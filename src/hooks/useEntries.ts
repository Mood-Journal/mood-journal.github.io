import { useCallback, useEffect, useRef } from 'react'
import { useEntriesContext } from '@/context/EntriesContext'
import { useAuth } from '@/context/AuthContext'
import { createMoodEntry, moodEntryFieldsSchema } from '@/models/moodEntry'
import { readEntries, appendEntry, updateEntry as sheetsUpdateEntry, deleteEntry as sheetsDeleteEntry } from '@/services/googleSheets'
import { loadLocalEntries, saveLocalEntries } from '@/lib/storage'
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
  // Tracks entry IDs currently being pushed by addEntry so the background
  // sync doesn't race and push the same entry a second time.
  const inFlightIds = useRef(new Set<string>())

  // Background sync with Sheets when auth'd and a sheet is configured.
  // Depends on state.sheetId so the effect re-runs when a sheet is connected
  // while auth is already established.
  useEffect(() => {
    if (authState.status !== 'authorised' || !authState.accessToken) return
    const spreadsheetId = state.sheetId
    if (!spreadsheetId) return

    const controller = new AbortController()

    readEntries(spreadsheetId, authState.accessToken, controller.signal)
      .then(async (sheetsEntries) => {
        const localEntries = await loadLocalEntries()
        const sheetsIds = new Set(sheetsEntries.map((e) => e.id))

        // Pending entries not yet in Sheets and not currently being pushed by addEntry
        const pendingToSync = localEntries.filter(
          (e) => e.syncStatus !== 'synced' && !sheetsIds.has(e.id) && !inFlightIds.current.has(e.id)
        )

        let pushedIds = new Set<string>()
        const token = authState.accessToken
        if (pendingToSync.length > 0 && token) {
          const results = await Promise.allSettled(
            pendingToSync.map((e) => appendEntry(spreadsheetId, token, e))
          )
          pushedIds = new Set(
            pendingToSync
              .filter((_, i) => results[i].status === 'fulfilled')
              .map((e) => e.id)
          )
        }

        // Retain entries that are still pending (push failed or in-flight via addEntry).
        // Synced entries absent from Sheets are dropped — they were deleted remotely.
        const retainLocal = localEntries.filter(
          (e) => e.syncStatus !== 'synced' && !sheetsIds.has(e.id) && !pushedIds.has(e.id)
        )

        const merged = mergeById(sheetsEntries, retainLocal)
        await saveLocalEntries(merged)
        dispatch({ type: 'SET_ENTRIES', payload: merged })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Failed to sync with Drive'
        dispatch({ type: 'SET_ERROR', payload: msg })
      })

    return () => controller.abort()
  }, [authState.status, authState.accessToken, dispatch, state.sheetId])

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
      const spreadsheetId = state.sheetId
      if (!accessToken || !spreadsheetId) return

      inFlightIds.current.add(entry.id)
      dispatch({ type: 'SET_SAVING' })
      try {
        await appendEntry(spreadsheetId, accessToken, entry)
        const syncedItems = newItems.map((e) =>
          e.id === entry.id ? { ...e, syncStatus: 'synced' as const } : e
        )
        dispatch({ type: 'SET_ENTRIES', payload: syncedItems })
        await saveLocalEntries(syncedItems)
      } catch (err: unknown) {
        let message = 'Saved locally. Could not sync to Drive — try again later.'
        if (err instanceof Response) {
          message = mapApiError(err.status, spreadsheetId)
        } else if (err instanceof Error) {
          message = err.message
        }
        dispatch({ type: 'SET_ERROR', payload: message })
      } finally {
        inFlightIds.current.delete(entry.id)
      }
    },
    [authState.accessToken, dispatch, state.items, state.sheetId]
  )

  const updateEntry = useCallback(
    async (updated: MoodEntry) => {
      const newItems = state.items.map((e) => (e.id === updated.id ? updated : e))
      dispatch({ type: 'UPDATE_ENTRY', payload: updated })
      await saveLocalEntries(newItems)

      const accessToken = authState.accessToken
      const spreadsheetId = state.sheetId
      if (!accessToken || !spreadsheetId || updated.syncStatus !== 'synced') return

      dispatch({ type: 'SET_SAVING' })
      try {
        await sheetsUpdateEntry(spreadsheetId, accessToken, updated)
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
    [authState.accessToken, dispatch, state.items, state.sheetId]
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const entry = state.items.find((e) => e.id === entryId)
      const newItems = state.items.filter((e) => e.id !== entryId)
      dispatch({ type: 'DELETE_ENTRY', payload: entryId })
      await saveLocalEntries(newItems)

      const accessToken = authState.accessToken
      const spreadsheetId = state.sheetId
      if (!accessToken || !spreadsheetId || entry?.syncStatus !== 'synced') return

      try {
        await sheetsDeleteEntry(spreadsheetId, accessToken, entryId)
      } catch {
        // Best effort — entry is already removed locally
      }
    },
    [authState.accessToken, dispatch, state.items, state.sheetId]
  )

  return {
    entries: state.items,
    status: state.status,
    error: state.error,
    addEntry,
    updateEntry,
    deleteEntry,
  }
}
