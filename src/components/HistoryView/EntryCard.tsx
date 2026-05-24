import { Badge, Card, Group, Stack, Text } from '@mantine/core'
import { type MoodEntry, deepestLabel, breadcrumb } from '@/models/moodEntry'
import { resolveColor } from '@/data/emotions'

interface EntryCardProps {
  entry: MoodEntry
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EntryCard({ entry }: EntryCardProps) {
  const color = resolveColor(entry.level1)
  const label = deepestLabel(entry)
  const path = breadcrumb(entry)
  const truncatedNote =
    entry.note && entry.note.length > 120 ? entry.note.slice(0, 120) + '…' : entry.note

  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Text size="sm" c="dimmed">
            {formatDate(entry.date)}
          </Text>
          <Badge color={color} variant="light">
            {label}
          </Badge>
        </Group>
        {path !== label && (
          <Text size="xs" c="dimmed">
            {path}
          </Text>
        )}
        {truncatedNote && (
          <Text size="sm" fs="italic" c="dimmed">
            &ldquo;{truncatedNote}&rdquo;
          </Text>
        )}
      </Stack>
    </Card>
  )
}
