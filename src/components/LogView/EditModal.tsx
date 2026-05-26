import { useState } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { EMOTIONS, resolveColor } from '@/data/emotions'
import { useEntries } from '@/hooks/useEntries'
import type { MoodEntry } from '@/models/moodEntry'
import EmotionCard from './EmotionCard'
import EmotionPicker from './EmotionPicker'
import styles from './LogView.module.css'

type Step = 'level1' | 'level2' | 'level3' | 'note'

interface EditModalProps {
  entry: MoodEntry
  onClose: () => void
}

export default function EditModal({ entry, onClose }: EditModalProps) {
  const { updateEntry, deleteEntry, status, error } = useEntries()

  const [step, setStep] = useState<Step>('note')
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)

  const [level1, setLevel1] = useState<string | null>(entry.level1)
  const [level2, setLevel2] = useState<string | null>(entry.level2)
  const [level3, setLevel3] = useState<string | null>(entry.level3)
  const [note, setNote] = useState(entry.note ?? '')
  const [date, setDate] = useState(entry.date)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const level1Node = EMOTIONS.find((e) => e.label === level1)
  const level2Node = level1Node?.children?.find((e) => e.label === level2)
  const rootColor = level1 ? resolveColor(level1) : 'violet'

  const isSaving = status === 'saving'

  function go(nextStep: Step, dir: 'forward' | 'back') {
    setAnimDir(dir)
    setStep(nextStep)
    setAnimKey((k) => k + 1)
  }

  function handleLevel1Select(label: string) {
    setLevel1(label)
    setLevel2(null)
    setLevel3(null)
    const node = EMOTIONS.find((e) => e.label === label)
    go(node?.children?.length ? 'level2' : 'note', 'forward')
  }

  function handleLevel2Select(label: string) {
    setLevel2(label)
    setLevel3(null)
    const node = level1Node?.children?.find((e) => e.label === label)
    go(node?.children?.length ? 'level3' : 'note', 'forward')
  }

  function handleLevel3Select(label: string) {
    setLevel3(label)
    go('note', 'forward')
  }

  function goBack(to: Step) {
    if (to === 'level1') { setLevel1(null); setLevel2(null); setLevel3(null) }
    else if (to === 'level2') { setLevel2(null); setLevel3(null) }
    else if (to === 'level3') { setLevel3(null) }
    go(to, 'back')
  }

  async function handleUpdate() {
    if (!level1) return
    const updated: MoodEntry = {
      ...entry,
      level1,
      level2,
      level3,
      note: note.trim() || null,
      date,
    }
    await updateEntry(updated)
    onClose()
  }

  async function handleDelete() {
    await deleteEntry(entry.id)
    onClose()
  }

  const crumbs: Array<{ label: string; backTo: Step }> = []
  if (level1) crumbs.push({ label: level1, backTo: 'level1' })
  if (level2) crumbs.push({ label: level2, backTo: 'level2' })
  if (level3) crumbs.push({ label: level3, backTo: 'level3' })

  function renderContent() {
    switch (step) {
      case 'level1':
        return (
          <Stack gap="md">
            <Title order={3}>How are you feeling?</Title>
            <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="sm">
              {EMOTIONS.map((node) => (
                <EmotionCard
                  key={node.label}
                  node={node}
                  selected={level1 === node.label}
                  dimmed={level1 !== null && level1 !== node.label}
                  onSelect={() => handleLevel1Select(node.label)}
                />
              ))}
            </SimpleGrid>
          </Stack>
        )

      case 'level2':
        return (
          <Stack gap="md">
            <Text size="sm" c="dimmed">More specifically…</Text>
            <EmotionPicker
              nodes={level1Node!.children!}
              color={rootColor}
              selected={level2}
              onSelect={handleLevel2Select}
              label="Level-2 emotions"
            />
            <Button
              variant="subtle"
              size="xs"
              onClick={() => go('note', 'forward')}
              color={rootColor}
              style={{ alignSelf: 'flex-start' }}
            >
              Skip →
            </Button>
          </Stack>
        )

      case 'level3':
        return (
          <Stack gap="md">
            <Text size="sm" c="dimmed">Even more precisely…</Text>
            <EmotionPicker
              nodes={level2Node!.children!}
              color={rootColor}
              selected={level3}
              onSelect={handleLevel3Select}
              label="Level-3 emotions"
            />
            <Button
              variant="subtle"
              size="xs"
              onClick={() => go('note', 'forward')}
              color={rootColor}
              style={{ alignSelf: 'flex-start' }}
            >
              Skip →
            </Button>
          </Stack>
        )

      case 'note':
        return (
          <Stack gap="md">
            <Textarea
              label="Note (optional)"
              placeholder="What's on your mind?"
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              maxLength={500}
              autosize
              minRows={3}
            />
            <TextInput
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
            {error && <Alert color="red" variant="light">{error}</Alert>}
            {confirmDelete ? (
              <Alert color="red" variant="light">
                <Stack gap="xs">
                  <Text size="sm">Delete this entry?</Text>
                  <Group gap="xs">
                    <Button size="xs" color="red" onClick={() => void handleDelete()} loading={isSaving}>
                      Delete
                    </Button>
                    <Button size="xs" variant="subtle" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            ) : (
              <Group justify="space-between">
                <Button
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
                <Button
                  onClick={() => void handleUpdate()}
                  loading={isSaving}
                  disabled={!level1 || isSaving}
                >
                  Save
                </Button>
              </Group>
            )}
          </Stack>
        )
    }
  }

  return (
    <Modal opened onClose={onClose} title="Edit entry" size="md">
      <Stack gap="md">
        {crumbs.length > 0 && (
          <Group gap={6} align="center">
            {crumbs.map(({ label, backTo }, i) => (
              <Group key={label} gap={6} align="center">
                {i > 0 && (
                  <Text size="xl" fw={700} c="dimmed" style={{ lineHeight: 1 }}>›</Text>
                )}
                <UnstyledButton
                  onClick={() => goBack(backTo)}
                  style={{
                    fontSize: 'var(--mantine-font-size-xl)',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color:
                      i === crumbs.length - 1
                        ? `var(--mantine-color-${rootColor}-7)`
                        : 'var(--mantine-color-dimmed)',
                  }}
                >
                  {label}
                </UnstyledButton>
              </Group>
            ))}
          </Group>
        )}

        <div
          key={animKey}
          className={animDir === 'forward' ? styles.slideInRight : styles.slideInLeft}
        >
          {renderContent()}
        </div>
      </Stack>
    </Modal>
  )
}
