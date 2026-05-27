import { createContext, useReducer, useContext, type ReactNode, type Dispatch } from 'react'

export interface AuthState {
  status: 'idle' | 'authorising' | 'authorised' | 'error'
  accessToken: string | null
  error: string | null
}

type AuthAction =
  | { type: 'SET_AUTHORISING' }
  | { type: 'SET_AUTHORISED'; payload: { accessToken: string } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR' }

const initialState: AuthState = {
  status: 'idle',
  accessToken: null,
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
        error: null,
      }
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload }
    case 'CLEAR':
      return initialState
  }
}

interface AuthContextValue {
  state: AuthState
  dispatch: Dispatch<AuthAction>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  return <AuthContext.Provider value={{ state, dispatch }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
