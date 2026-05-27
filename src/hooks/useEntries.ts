import { useCallback, useEffect } from 'react'
import { useEntriesContext } from '@/context/EntriesContext'
import { useAuth } from '@/context/AuthContext'
import { createMoodEntry, moodEntryFieldsSchema } from '@/models/moodEntry'
import * as syncEngine from '@/services/syncEngine'
import type { MoodEntryFields, MoodEntry } from '@/models/moodEntry'

export function useEntries() {
  const { state, dispatch } = useEntriesContext()
  const { state: authState } = useAuth()

  // Background reconcile when auth'd and a sheet is configured. Depends on
  // state.sheetId so it re-runs when a sheet is connected while already authorised.
  // syncEngine.runSync is single-flight, so the parallel hook instances (Log,
  // History, EditModal) collapse into one network run.
  useEffect(() => {
    if (authState.status !== 'authorised' || !authState.accessToken || !state.sheetId) return

    syncEngine
      .runSync(state.sheetId, authState.accessToken)
      .then((entries) => dispatch({ type: 'SET_ENTRIES', payload: entries }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to sync with Drive'
        dispatch({ type: 'SET_ERROR', payload: msg })
      })
  }, [authState.status, authState.accessToken, dispatch, state.sheetId])

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
