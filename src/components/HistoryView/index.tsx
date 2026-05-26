import { Alert, Skeleton, Stack, Text, Title } from '@mantine/core'
import { useEntries } from '@/hooks/useEntries'
import EntryCard from './EntryCard'

export default function HistoryView() {
  const { entries, status, error } = useEntries()

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
          {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
