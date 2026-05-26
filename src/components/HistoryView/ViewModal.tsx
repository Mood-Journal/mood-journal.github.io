import { Badge, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { type MoodEntry, deepestLabel, breadcrumb } from '@/models/moodEntry'
import { resolveColor } from '@/data/emotions'

interface ViewModalProps {
  entry: MoodEntry
  onEdit: () => void
  onClose: () => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ViewModal({ entry, onEdit, onClose }: ViewModalProps) {
  const color = resolveColor(entry.level1)
  const label = deepestLabel(entry)
  const path = breadcrumb(entry)

  return (
    <Modal opened onClose={onClose} title={formatDate(entry.date)} size="md">
      <Stack gap="md">
        <Group gap="xs" align="center">
          <Badge color={color} variant="light" size="lg">
            {label}
          </Badge>
          {path !== label && (
            <Text size="sm" c="dimmed">
              {path}
            </Text>
          )}
        </Group>

        {entry.note ? (
          <Text size="sm" fs="italic" c="dimmed">
            &ldquo;{entry.note}&rdquo;
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            No note.
          </Text>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onEdit}>
            Edit
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
