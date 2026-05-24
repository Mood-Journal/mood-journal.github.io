import { useState } from 'react'
import {
  Alert,
  Button,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { EMOTIONS, resolveColor } from '@/data/emotions'
import { useEntries } from '@/hooks/useEntries'
import EmotionCard from './EmotionCard'
import EmotionPicker from './EmotionPicker'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function LogView() {
  const { addEntry, status, error } = useEntries()

  const [level1, setLevel1] = useState<string | null>(null)
  const [level2, setLevel2] = useState<string | null>(null)
  const [level2Skipped, setLevel2Skipped] = useState(false)
  const [level3, setLevel3] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [saved, setSaved] = useState(false)

  const level1Node = EMOTIONS.find((e) => e.label === level1)
  const level2Node = level1Node?.children?.find((e) => e.label === level2)
  const rootColor = level1 ? resolveColor(level1) : 'violet'

  const showLevel2 = level1 !== null
  const showLevel3 = level2 !== null && (level2Node?.children?.length ?? 0) > 0
  const showNoteAndSave = level1 !== null && (level2 !== null || level2Skipped)

  function handleLevel1Select(label: string) {
    if (label === level1) return
    setLevel1(label)
    setLevel2(null)
    setLevel2Skipped(false)
    setLevel3(null)
  }

  function handleLevel2Select(label: string) {
    setLevel2(label)
    setLevel2Skipped(false)
    setLevel3(null)
  }

  function handleSkipLevel2() {
    setLevel2(null)
    setLevel2Skipped(true)
    setLevel3(null)
  }

  function handleSkipLevel3() {
    setLevel3(null)
  }

  function reset() {
    setLevel1(null)
    setLevel2(null)
    setLevel2Skipped(false)
    setLevel3(null)
    setNote('')
    setDate(today())
    setSaved(false)
  }

  async function handleSave() {
    if (!level1) return
    await addEntry({
      date,
      level1,
      level2: level2 ?? undefined,
      level3: level3 ?? undefined,
      note: note.trim() || undefined,
    })
    setSaved(true)
    setTimeout(reset, 1500)
  }

  const isSaving = status === 'saving'

  return (
    <Stack gap="lg" py="md">
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

      {showLevel2 && level1Node?.children && (
        <>
          <Divider />
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              More specifically…
            </Text>
            <EmotionPicker
              nodes={level1Node.children}
              color={rootColor}
              selected={level2}
              onSelect={handleLevel2Select}
              label="Level-2 emotions"
            />
            {!level2 && (
              <Button
                variant="subtle"
                size="xs"
                onClick={handleSkipLevel2}
                color={rootColor}
                style={{ alignSelf: 'flex-start' }}
              >
                Skip →
              </Button>
            )}
          </Stack>
        </>
      )}

      {showLevel3 && level2Node?.children && (
        <>
          <Divider />
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              Even more precisely…
            </Text>
            <EmotionPicker
              nodes={level2Node.children}
              color={rootColor}
              selected={level3}
              onSelect={setLevel3}
              label="Level-3 emotions"
            />
            {!level3 && (
              <Button
                variant="subtle"
                size="xs"
                onClick={handleSkipLevel3}
                color={rootColor}
                style={{ alignSelf: 'flex-start' }}
              >
                Skip →
              </Button>
            )}
          </Stack>
        </>
      )}

      {showNoteAndSave && (
        <>
          <Divider />
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
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            {saved && (
              <Alert color="green" variant="light">
                Saved!
              </Alert>
            )}
            <Group justify="flex-end">
              <Button
                onClick={() => void handleSave()}
                loading={isSaving}
                disabled={!level1 || isSaving}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </>
      )}
    </Stack>
  )
}
