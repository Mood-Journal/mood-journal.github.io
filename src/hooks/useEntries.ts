import { useCallback, useEffect } from 'react'
import { useEntriesContext } from '@/context/EntriesContext'
import { useAuth } from '@/context/AuthContext'
import { createMoodEntry, moodEntryFieldsSchema } from '@/models/moodEntry'
import * as syncEngine from '@/services/syncEngine'
import type { MoodEntryFields, MoodEntry } from '@/models/moodEntry'

export function useEntries() {
  const { state, dispatch } = useEntriesContext()
  const { state: authState, dispatch: authDispatch } = useAuth()

  // Reconcile with the sheet whenever a (fresh) token arrives and a sheet is
  // configured. A new token is minted on every Sync press, so this is the path
  // that pulls remote changes and pushes pending local ones. syncEngine.runSync
  // is single-flight, so the parallel hook instances (Log, History, EditModal)
  // collapse into one network run.
  useEffect(() => {
    if (authState.status !== 'authorised' || !authState.accessToken || !state.sheetId) return
    const sheetId = state.sheetId
    const accessToken = authState.accessToken

    dispatch({ type: 'SET_SYNCING', payload: true })
    syncEngine
      .runSync(sheetId, accessToken)
      .then((entries) => dispatch({ type: 'SET_ENTRIES', payload: entries }))
      .catch((err: unknown) => {
        // Sync failures surface on the Sync bar (auth state), not the entries
        // status, so a transient Drive error never blanks the user's history.
        const msg =
          err instanceof Response
            ? syncEngine.mapApiError(err.status, sheetId)
            : err instanceof Error
              ? err.message
              : 'Could not sync with Google Drive.'
        authDispatch({ type: 'SET_ERROR', payload: msg })
      })
      .finally(() => dispatch({ type: 'SET_SYNCING', payload: false }))
  }, [authState.status, authState.accessToken, authDispatch, dispatch, state.sheetId])

  const addEntry = useCallback(
    async (fields: MoodEntryFields) => {
      const validation = moodEntryFieldsSchema.safeParse(fields)
      if (!validation.success) return

      const entry = createMoodEntry(fields)
      dispatch({ type: 'APPEND_ENTRY', payload: entry })

      const { accessToken } = authState
      const spreadsheetId = state.sheetId
      if (accessToken && spreadsheetId) dispatch({ type: 'SET_SAVING' })

      const { entries, error } = await syncEngine.addEntry(entry, spreadsheetId, accessToken)
      if (error) dispatch({ type: 'SET_ERROR', payload: error })
      else dispatch({ type: 'SET_ENTRIES', payload: entries })
    },
    [authState, dispatch, state.sheetId]
  )

  const updateEntry = useCallback(
    async (updated: MoodEntry) => {
      dispatch({ type: 'UPDATE_ENTRY', payload: updated })

      const { accessToken } = authState
      const spreadsheetId = state.sheetId
      if (accessToken && spreadsheetId && updated.syncStatus === 'synced') {
        dispatch({ type: 'SET_SAVING' })
      }

      const { entries, error } = await syncEngine.updateEntry(updated, spreadsheetId, accessToken)
      if (error) dispatch({ type: 'SET_ERROR', payload: error })
      else dispatch({ type: 'SET_ENTRIES', payload: entries })
    },
    [authState, dispatch, state.sheetId]
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      dispatch({ type: 'DELETE_ENTRY', payload: entryId })
      const { entries } = await syncEngine.deleteEntry(
        entryId,
        state.sheetId,
        authState.accessToken
      )
      dispatch({ type: 'SET_ENTRIES', payload: entries })
    },
    [authState, dispatch, state.sheetId]
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
