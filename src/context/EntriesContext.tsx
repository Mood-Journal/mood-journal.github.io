import { createContext, useReducer, useContext, useEffect, type ReactNode, type Dispatch } from 'react'
import type { MoodEntry } from '@/models/moodEntry'
import { loadLocalEntries } from '@/lib/storage'

export interface EntriesState {
  status: 'idle' | 'loading' | 'loaded' | 'saving' | 'error'
  items: MoodEntry[]
  error: string | null
}

type EntriesAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_ENTRIES'; payload: MoodEntry[] }
  | { type: 'APPEND_ENTRY'; payload: MoodEntry }
  | { type: 'SET_SAVING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }

const initialState: EntriesState = {
  status: 'idle',
  items: [],
  error: null,
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
    case 'SET_SAVING':
      return { ...state, status: 'saving' }
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload }
    case 'RESET':
      return initialState
  }
}

interface EntriesContextValue {
  state: EntriesState
  dispatch: Dispatch<EntriesAction>
}

const EntriesContext = createContext<EntriesContextValue | null>(null)

export function EntriesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(entriesReducer, initialState)

  useEffect(() => {
    dispatch({ type: 'SET_LOADING' })
    loadLocalEntries().then((entries) => {
      dispatch({ type: 'SET_ENTRIES', payload: entries })
    })
  }, [])

  return (
    <EntriesContext.Provider value={{ state, dispatch }}>{children}</EntriesContext.Provider>
  )
}

export function useEntriesContext(): EntriesContextValue {
  const ctx = useContext(EntriesContext)
  if (!ctx) throw new Error('useEntriesContext must be used within EntriesProvider')
  return ctx
}
