import { useMemo, useState } from 'react'
import { Alert, Skeleton, Stack, Text, Title } from '@mantine/core'
import { useEntries } from '@/hooks/useEntries'
import type { MoodEntry } from '@/models/moodEntry'
import EntryCard from './EntryCard'
import ViewModal from './ViewModal'
import EditModal from '../LogView/EditModal'

export default function HistoryView() {
  const { entries, status, error } = useEntries()
  const [viewing, setViewing] = useState<MoodEntry | null>(null)
  const [editing, setEditing] = useState<MoodEntry | null>(null)

  // Sort here because APPEND_ENTRY prepends unconditionally; a past-dated
  // entry would otherwise appear at the top until the next sync runs mergeById.
  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      ),
    [entries]
  )

  return (
    <Stack gap="md" py="md">
      <Title order={3}>Your entries</Title>

      {(status === 'idle' || status === 'loading') && (
        <Stack gap="sm">
          <Skeleton height={80} radius="md" />
          <Skeleton height={80} radius="md" />
          <Skeleton height={80} radius="md" />
        </Stack>
      )}

      {status === 'error' && (
        <Alert color="red" variant="light">
          {error ?? 'Failed to load entries.'}
        </Alert>
      )}

      {(status === 'loaded' || status === 'saving') && entries.length === 0 && (
        <Text c="dimmed">No entries yet. Log your first mood above!</Text>
      )}

      {(status === 'loaded' || status === 'saving') && entries.length > 0 && (
        <Stack gap="sm">
          {sortedEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onSelect={() => setViewing(entry)} />
          ))}
        </Stack>
      )}

      {viewing && !editing && (
        <ViewModal
          entry={viewing}
          onEdit={() => { setEditing(viewing); setViewing(null) }}
          onClose={() => setViewing(null)}
        />
      )}

      {editing && (
        <EditModal entry={editing} onClose={() => setEditing(null)} />
      )}
    </Stack>
  )
}
