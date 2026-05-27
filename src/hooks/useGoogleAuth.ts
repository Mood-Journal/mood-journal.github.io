import { useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

const SCOPE = [
  'https://www.googleapis.com/auth/drive.file',
].join(' ')
const GIS_SRC = 'https://accounts.google.com/gsi/client'

export function useGoogleAuth() {
  const { dispatch } = useAuth()

  useEffect(() => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) return
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    document.body.appendChild(script)
  }, [])

  // Acquire an access token. Google's token model gives short-lived tokens with
  // no silent renewal: a new one must be requested from a user gesture (a button
  // press) and on 401. prompt:'' reuses the existing grant, so repeat presses are
  // silent once the user has consented and a Google session is active.
  const initiateAuth = useCallback(() => {
    const gis = window.google?.accounts.oauth2
    if (!gis) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Google sign-in is still loading — please try again in a moment.',
      })
      return
    }

    const client = gis.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
      scope: SCOPE,
      prompt: '',
      callback(response) {
        if (response.access_token) {
          dispatch({ type: 'SET_AUTHORISED', payload: { accessToken: response.access_token } })
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Authorisation failed. Please try again.' })
        }
      },
      error_callback(error) {
        // The user dismissing the popup is not an error worth surfacing.
        if (error.type === 'popup_closed') {
          dispatch({ type: 'CLEAR' })
        } else {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Could not connect to Google Drive. Please try again.',
          })
        }
      },
    })

    dispatch({ type: 'SET_AUTHORISING' })
    client.requestAccessToken()
  }, [dispatch])

  return { initiateAuth }
}
