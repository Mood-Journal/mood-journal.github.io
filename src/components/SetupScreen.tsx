import { type ReactNode, useState } from 'react'
import {
  Alert,
  Button,
  Center,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useAuth } from '@/context/AuthContext'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { initSheet, createSpreadsheet } from '@/services/googleSheets'
import { loadSheetRef, saveSheetRef } from '@/lib/storage'

const GAPI_SRC = 'https://apis.google.com/js/api.js'

function loadPickerApi(): Promise<void> {
  if (window.gapi) return Promise.resolve()
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GAPI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = GAPI_SRC
    script.onload = () => resolve()
    document.body.appendChild(script)
  })
}

function openDrivePicker(accessToken: string): Promise<{ id: string; name: string } | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string
  return loadPickerApi().then(
    () =>
      new Promise((resolve) => {
        window.gapi!.load('picker', () => {
          new window.google!.picker!.PickerBuilder()
            .setDeveloperKey(apiKey)
            .setOAuthToken(accessToken)
            .addView(
              new window.google!.picker!.DocsView().setMimeTypes(
                'application/vnd.google-apps.spreadsheet'
              )
            )
            .setCallback((data) => {
              if (data.action === 'picked' && data.docs?.[0]) {
                resolve({ id: data.docs[0].id, name: data.docs[0].name })
              } else if (data.action === 'cancel') {
                resolve(null)
              }
            })
            .build()
            .setVisible(true)
        })
      })
  )
}

interface SpreadsheetPickerProps {
  accessToken: string
  onSelected: (id: string) => void
}

function SpreadsheetPicker({ accessToken, onSelected }: SpreadsheetPickerProps) {
  const [creating, setCreating] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [createError, setCreateError] = useState('')
  const [connectError, setConnectError] = useState('')

  async function handleCreate() {
    setCreating(true)
    setCreateError('')
    try {
      const ref = await createSpreadsheet(accessToken)
      await initSheet(ref.id, accessToken)
      saveSheetRef(ref)
      onSelected(ref.id)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create spreadsheet')
    } finally {
      setCreating(false)
    }
  }

  async function handleBrowse() {
    setBrowsing(true)
    setConnectError('')
    try {
      const file = await openDrivePicker(accessToken)
      if (!file) return
      await initSheet(file.id, accessToken)
      saveSheetRef({ id: file.id, title: file.name })
      onSelected(file.id)
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Failed to connect spreadsheet')
    } finally {
      setBrowsing(false)
    }
  }

  return (
    <Stack gap="xl">
      <Stack gap="xs">
        <Text fw={500}>First time? Create a new Mood Ledger in your Drive:</Text>
        <Button onClick={handleCreate} disabled={creating} loading={creating}>
          {creating ? 'Creating…' : 'Create Mood Ledger'}
        </Button>
        {createError && (
          <Alert color="red" variant="light">
            {createError}
          </Alert>
        )}
      </Stack>
      <Stack gap="xs">
        <Text fw={500}>Returning? Pick your existing spreadsheet:</Text>
        <Button variant="outline" onClick={handleBrowse} disabled={browsing} loading={browsing}>
          {browsing ? 'Connecting…' : 'Browse Drive'}
        </Button>
        {connectError && (
          <Alert color="red" variant="light">
            {connectError}
          </Alert>
        )}
      </Stack>
    </Stack>
  )
}

export default function SetupScreen({ children }: { children: ReactNode }) {
  const { state, dispatch } = useAuth()
  const { initiateAuth } = useGoogleAuth()
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(
    () => loadSheetRef()?.id ?? null
  )

  const sheetRef = state.status === 'error' ? loadSheetRef() : null

  if (state.status === 'authorised' && spreadsheetId) {
    return <>{children}</>
  }

  if (state.status === 'authorised' && !spreadsheetId) {
    return (
      <Center mih="100dvh" p="xl">
        <Stack maw={480} w="100%" gap="lg">
          <Title order={2}>Set up your spreadsheet</Title>
          <SpreadsheetPicker
            accessToken={state.accessToken!}
            onSelected={(id) => setSpreadsheetId(id)}
          />
        </Stack>
      </Center>
    )
  }

  if (state.status === 'restoring' || state.status === 'authorising') {
    return (
      <Center mih="100dvh">
        <Stack align="center" gap="md">
          <Title order={1}>Mood Journal</Title>
          <Loader size="sm" />
          <Text c="dimmed">Reconnecting…</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Center mih="100dvh" p="xl">
      <Stack maw={400} w="100%" align="center" gap="xl">
        <Stack align="center" gap="sm">
          <Title order={1}>Mood Journal</Title>
          <Text size="lg" c="dimmed" ta="center">
            Track how you feel, day by day.
          </Text>
        </Stack>

        {state.status === 'error' ? (
          <Stack align="center" gap="sm">
            <Alert color="red" variant="light" w="100%">
              {state.error}
            </Alert>
            {sheetRef && (
              <Text c="dimmed" size="sm">
                Your spreadsheet &ldquo;{sheetRef.title}&rdquo; is still connected.
              </Text>
            )}
            <Button
              onClick={() => {
                dispatch({ type: 'CLEAR' })
                initiateAuth()
              }}
            >
              Reconnect Google Account
            </Button>
          </Stack>
        ) : (
          <Stack align="center" gap="sm">
            <Text size="sm" c="dimmed" ta="center">
              Connect your Google account to save entries to your own spreadsheet.
            </Text>
            <Button onClick={initiateAuth}>Connect Google Account</Button>
          </Stack>
        )}
      </Stack>
    </Center>
  )
}
