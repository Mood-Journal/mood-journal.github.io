import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { EMOTIONS, findLevel1Node, resolveColor } from '@/data/emotions'
import { useEntries } from '@/hooks/useEntries'
import EmotionCard from './EmotionCard'
import EmotionPicker from './EmotionPicker'
import styles from './LogView.module.css'

function today(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

type Step = 'level1' | 'level2' | 'level3' | 'note'

export default function LogView() {
  const { addEntry, status, error } = useEntries()

  const [step, setStep] = useState<Step>('level1')
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)

  const [level1, setLevel1] = useState<string | null>(null)
  const [level2, setLevel2] = useState<string | null>(null)
  const [level3, setLevel3] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [saved, setSaved] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  const level1Node = useMemo(() => findLevel1Node(level1), [level1])
  const level2Node = useMemo(
    () => level1Node?.children?.find((e) => e.label === level2),
    [level1Node, level2]
  )
  const rootColor = level1 ? resolveColor(level1) : 'violet'

  function go(nextStep: Step, dir: 'forward' | 'back') {
    setAnimDir(dir)
    setStep(nextStep)
    setAnimKey((k) => k + 1)
  }

  function handleLevel1Select(label: string) {
    setLevel1(label)
    setLevel2(null)
    setLevel3(null)
    const node = findLevel1Node(label)
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

  // Ref so the popstate listener always calls the latest closure without re-subscribing.
  // Assigned in an effect (not during render) so it never updates a ref mid-render.
  const handleBackRef = useRef<() => void>(() => {})
  useEffect(() => {
    handleBackRef.current = () => {
      switch (step) {
        case 'level2': goBack('level1'); break
        case 'level3': goBack('level2'); break
        case 'note':
          if (level3 !== null) goBack('level3')
          else if (level2Node?.children?.length) goBack('level3')
          else if (level2 !== null) goBack('level2')
          else if (level1Node?.children?.length) goBack('level2')
          else goBack('level1')
          break
      }
    }
  })

  // Push a history marker so the back button stays in-flow; pop it when leaving
  useEffect(() => {
    if (step === 'level1') return
    history.pushState({ moodJournalInterceptor: true }, '')
    const onPop = () => handleBackRef.current()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [step])

  function reset() {
    setLevel1(null)
    setLevel2(null)
    setLevel3(null)
    setNote('')
    setDate(today())
    setSaved(false)
    go('level1', 'forward')
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
                  selected={false}
                  dimmed={false}
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
              selected={null}
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
              selected={null}
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
            {error && (
              <Alert color="red" variant="light">{error}</Alert>
            )}
            {saved && (
              <Alert color="green" variant="light">Saved!</Alert>
            )}
            <Group justify="flex-end">
              <Popover
                opened={discardOpen}
                onClose={() => setDiscardOpen(false)}
                position="top"
                withArrow
                shadow="md"
              >
                <Popover.Target>
                  <Button
                    variant="subtle"
                    color="gray"
                    disabled={isSaving}
                    onClick={() => setDiscardOpen(true)}
                  >
                    Discard
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs">
                    <Text size="sm">Discard this entry?</Text>
                    <Group gap="xs" justify="flex-end">
                      <Button size="xs" variant="subtle" color="gray" onClick={() => setDiscardOpen(false)}>
                        Cancel
                      </Button>
                      <Button size="xs" color="red" onClick={() => { setDiscardOpen(false); reset() }}>
                        Discard
                      </Button>
                    </Group>
                  </Stack>
                </Popover.Dropdown>
              </Popover>
              <Button
                onClick={() => void handleSave()}
                loading={isSaving}
                disabled={!level1 || isSaving}
              >
                Save
              </Button>
            </Group>
          </Stack>
        )
    }
  }

  return (
    <Stack gap="md" py="md">
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
                  color: i === crumbs.length - 1
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
  )
}
