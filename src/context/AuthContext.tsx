import { createContext, useReducer, useContext, useEffect, type ReactNode, type Dispatch } from 'react'
import { loadSessionHint, saveSessionHint, clearSessionHint } from '@/lib/storage'

export interface AuthState {
  status: 'idle' | 'restoring' | 'authorising' | 'authorised' | 'error'
  accessToken: string | null
  expiresAt: number | null
  error: string | null
}

type AuthAction =
  | { type: 'SET_AUTHORISING' }
  | { type: 'SET_AUTHORISED'; payload: { accessToken: string; expiresAt: number } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR' }

const initialState: AuthState = {
  status: 'idle',
  accessToken: null,
  expiresAt: null,
  error: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_AUTHORISING':
      return { ...state, status: 'authorising', error: null }
    case 'SET_AUTHORISED':
      return {
        status: 'authorised',
        accessToken: action.payload.accessToken,
        expiresAt: action.payload.expiresAt,
        error: null,
      }
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload }
    case 'CLEAR':
      return initialState
  }
}

function initFromCache(init: AuthState): AuthState {
  if (loadSessionHint()) {
    return { ...init, status: 'restoring' }
  }
  return init
}

interface AuthContextValue {
  state: AuthState
  dispatch: Dispatch<AuthAction>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState, initFromCache)

  useEffect(() => {
    if (state.status === 'authorised' && state.expiresAt) {
      saveSessionHint({ expiresAt: state.expiresAt })
    } else if (state.status === 'idle' || state.status === 'error') {
      clearSessionHint()
    }
  }, [state.status, state.expiresAt])

  return <AuthContext.Provider value={{ state, dispatch }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
