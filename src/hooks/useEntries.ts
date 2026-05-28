import { useCallback } from 'react'
import { useEntriesContext } from '@/context/EntriesContext'
import { useAuth } from '@/context/AuthContext'
import { createMoodEntry, moodEntryFieldsSchema } from '@/models/moodEntry'
import * as syncEngine from '@/services/syncEngine'
import type { MoodEntryFields, MoodEntry } from '@/models/moodEntry'

export function useEntries() {
  const { state, dispatch } = useEntriesContext()
  const { state: authState } = useAuth()
  const accessToken = authState.accessToken
  const sheetId = state.sheetId

  const addEntry = useCallback(
    async (fields: MoodEntryFields) => {
      const validation = moodEntryFieldsSchema.safeParse(fields)
      if (!validation.success) return

      const entry = createMoodEntry(fields)
      dispatch({ type: 'APPEND_ENTRY', payload: entry })

      if (accessToken && sheetId) dispatch({ type: 'SET_SAVING' })

      const { entries, error } = await syncEngine.addEntry(entry, sheetId, accessToken)
      if (error) dispatch({ type: 'SET_ERROR', payload: error })
      else dispatch({ type: 'SET_ENTRIES', payload: entries })
    },
    [accessToken, dispatch, sheetId]
  )

  const updateEntry = useCallback(
    async (updated: MoodEntry) => {
      dispatch({ type: 'UPDATE_ENTRY', payload: updated })

      if (accessToken && sheetId && updated.syncStatus === 'synced') {
        dispatch({ type: 'SET_SAVING' })
      }

      const { entries, error } = await syncEngine.updateEntry(updated, sheetId, accessToken)
      if (error) dispatch({ type: 'SET_ERROR', payload: error })
      else dispatch({ type: 'SET_ENTRIES', payload: entries })
    },
    [accessToken, dispatch, sheetId]
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      dispatch({ type: 'DELETE_ENTRY', payload: entryId })
      const { entries } = await syncEngine.deleteEntry(entryId, sheetId, accessToken)
      dispatch({ type: 'SET_ENTRIES', payload: entries })
    },
    [accessToken, dispatch, sheetId]
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
