import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
} from '@mantine/core'
import { useAuth } from '@/context/AuthContext'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { loadSheetRef, saveSheetRef } from '@/lib/storage'
import { initSheet, createSpreadsheet } from '@/services/googleSheets'

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
  onSelected: () => void
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
      onSelected()
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
      onSelected()
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
        <Button onClick={() => void handleCreate()} disabled={creating} loading={creating}>
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
        <Button
          variant="outline"
          onClick={() => void handleBrowse()}
          disabled={browsing}
          loading={browsing}
        >
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

export default function SyncBar() {
  const { state, dispatch } = useAuth()
  const { initiateAuth } = useGoogleAuth()
  const [hasSheet, setHasSheet] = useState(() => loadSheetRef() !== null)

  const showSetup = state.status === 'authorised' && !hasSheet

  // Nothing to show once fully connected
  if (state.status === 'authorised' && hasSheet) return null

  const isConnecting = state.status === 'restoring' || state.status === 'authorising'

  return (
    <>
      <Box
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-body)',
          padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
          zIndex: 100,
        }}
      >
        <Group justify="space-between" align="center" maw={600} mx="auto">
          <Text size="sm" c="dimmed">
            {state.status === 'error'
              ? state.error
              : isConnecting
                ? 'Connecting to Google Drive…'
                : 'Your entries are saved on this device.'}
          </Text>
          {!isConnecting && (
            <Button
              size="xs"
              variant={state.status === 'error' ? 'filled' : 'light'}
              onClick={() => {
                if (state.status === 'error') dispatch({ type: 'CLEAR' })
                initiateAuth()
              }}
            >
              {state.status === 'error' ? 'Reconnect Google Drive' : 'Sync with Google Drive'}
            </Button>
          )}
          {isConnecting && <Loader size="xs" />}
        </Group>
      </Box>

      <Modal
        opened={showSetup}
        onClose={() => dispatch({ type: 'CLEAR' })}
        title="Set up Google Drive sync"
        centered
      >
        {state.status === 'authorised' && state.accessToken && (
          <SpreadsheetPicker
            accessToken={state.accessToken}
            onSelected={() => setHasSheet(true)}
          />
        )}
      </Modal>
    </>
  )
}
