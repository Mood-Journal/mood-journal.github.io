import { createContext, useReducer, useContext, useEffect, type ReactNode, type Dispatch } from 'react'
import type { MoodEntry } from '@/models/moodEntry'
import { loadLocalEntries, loadSheetRef } from '@/lib/storage'
import { useAuth } from './AuthContext'
import * as syncEngine from '@/services/syncEngine'

export interface EntriesState {
  status: 'idle' | 'loading' | 'loaded' | 'saving' | 'error'
  items: MoodEntry[]
  error: string | null
  sheetId: string | null
  // Drive reconcile in flight. Kept separate from `status` so the Sync bar can
  // show progress without disabling the Log form or blanking the History list.
  syncing: boolean
}

type EntriesAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_ENTRIES'; payload: MoodEntry[] }
  | { type: 'APPEND_ENTRY'; payload: MoodEntry }
  | { type: 'UPDATE_ENTRY'; payload: MoodEntry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'SET_SAVING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'RESET' }
  | { type: 'SET_SHEET_ID'; payload: string | null }

function createInitialState(): EntriesState {
  return {
    status: 'idle',
    items: [],
    error: null,
    sheetId: loadSheetRef()?.id ?? null,
    syncing: false,
  }
}

function entriesReducer(state: EntriesState, action: EntriesAction): EntriesState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, status: 'loading', error: null }
    case 'SET_ENTRIES':
      return { ...state, status: 'loaded', items: action.payload, error: null }
    case 'APPEND_ENTRY':
      return {
        ...state,
        status: 'loaded',
        items: [action.payload, ...state.items],
        error: null,
      }
    case 'UPDATE_ENTRY':
      return {
        ...state,
        status: 'loaded',
        items: state.items.map((e) => (e.id === action.payload.id ? action.payload : e)),
        error: null,
      }
    case 'DELETE_ENTRY':
      return {
        ...state,
        status: 'loaded',
        items: state.items.filter((e) => e.id !== action.payload),
        error: null,
      }
    case 'SET_SAVING':
      return { ...state, status: 'saving' }
    case 'SET_SYNCING':
      return { ...state, syncing: action.payload }
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload }
    case 'RESET':
      return createInitialState()
    case 'SET_SHEET_ID':
      return { ...state, sheetId: action.payload }
  }
}

interface EntriesContextValue {
  state: EntriesState
  dispatch: Dispatch<EntriesAction>
}

const EntriesContext = createContext<EntriesContextValue | null>(null)

export function EntriesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(entriesReducer, null, createInitialState)
  const { state: authState, dispatch: authDispatch } = useAuth()
  const sheetId = state.sheetId
  const accessToken = authState.accessToken
  const authStatus = authState.status

  useEffect(() => {
    dispatch({ type: 'SET_LOADING' })
    loadLocalEntries().then((entries) => {
      dispatch({ type: 'SET_ENTRIES', payload: entries })
    })
  }, [])

  // Single reconcile effect owned by the provider — consumers used to each
  // register one, so an auth/sheet change dispatched SET_ENTRIES once per
  // mounted consumer.
  useEffect(() => {
    if (authStatus !== 'authorised' || !accessToken || !sheetId) return

    dispatch({ type: 'SET_SYNCING', payload: true })
    syncEngine
      .runSync(sheetId, accessToken)
      .then((entries) => dispatch({ type: 'SET_ENTRIES', payload: entries }))
      .catch((err: unknown) => {
        const msg =
          err instanceof Response
            ? syncEngine.mapApiError(err.status, sheetId)
            : err instanceof Error
              ? err.message
              : 'Could not sync with Google Drive.'
        authDispatch({ type: 'SET_ERROR', payload: msg })
      })
      .finally(() => dispatch({ type: 'SET_SYNCING', payload: false }))
  }, [authStatus, accessToken, sheetId, authDispatch])

  return (
    <EntriesContext.Provider value={{ state, dispatch }}>{children}</EntriesContext.Provider>
  )
}

export function useEntriesContext(): EntriesContextValue {
  const ctx = useContext(EntriesContext)
  if (!ctx) throw new Error('useEntriesContext must be used within EntriesProvider')
  return ctx
}
