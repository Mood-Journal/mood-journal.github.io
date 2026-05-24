import { useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

const SCOPE = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const REFRESH_BUFFER_MS = 5 * 60 * 1000

export function useGoogleAuth() {
  const { state, dispatch } = useAuth()

  useEffect(() => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) return
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    document.body.appendChild(script)
  }, [])

  const buildClient = useCallback(
    (silent: boolean) => {
      const gis = window.google?.accounts.oauth2
      if (!gis) return null
      return gis.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
        scope: SCOPE,
        callback(response) {
          if (response.access_token) {
            const expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000
            dispatch({
              type: 'SET_AUTHORISED',
              payload: { accessToken: response.access_token, expiresAt },
            })
          } else if (!silent) {
            dispatch({
              type: 'SET_ERROR',
              payload: 'Authorisation failed. Please try again.',
            })
          } else {
            dispatch({ type: 'CLEAR' })
          }
        },
      })
    },
    [dispatch]
  )

  useEffect(() => {
    if (state.status !== 'restoring') return

    function attempt(): boolean {
      const client = buildClient(true)
      if (!client) return false
      dispatch({ type: 'SET_AUTHORISING' })
      client.requestAccessToken({ prompt: 'none' })
      return true
    }

    if (!attempt()) {
      const script = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
      if (!script) return
      const onLoad = () => {
        attempt()
      }
      script.addEventListener('load', onLoad)
      return () => script.removeEventListener('load', onLoad)
    }
  }, [state.status, buildClient, dispatch])

  useEffect(() => {
    if (state.status !== 'authorised' || !state.expiresAt) return
    const delay = state.expiresAt - REFRESH_BUFFER_MS - Date.now()

    function refresh() {
      const client = buildClient(true)
      client?.requestAccessToken({ prompt: 'none' })
    }

    if (delay <= 0) {
      refresh()
      return
    }
    const id = setTimeout(refresh, delay)
    return () => clearTimeout(id)
  }, [state.status, state.expiresAt, buildClient])

  function initiateAuth() {
    const client = buildClient(false)
    dispatch({ type: 'SET_AUTHORISING' })
    client?.requestAccessToken()
  }

  function handleApiError(status: number) {
    if (status === 401) {
      dispatch({ type: 'SET_ERROR', payload: 'Session expired — Reconnect' })
    }
  }

  return { initiateAuth, handleApiError }
}
