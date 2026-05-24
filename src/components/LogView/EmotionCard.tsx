import { Card, Text, UnstyledButton } from '@mantine/core'
import type { EmotionNode } from '@/data/emotions'

interface EmotionCardProps {
  node: EmotionNode
  selected: boolean
  dimmed: boolean
  onSelect: () => void
}

export default function EmotionCard({ node, selected, dimmed, onSelect }: EmotionCardProps) {
  return (
    <UnstyledButton onClick={onSelect} style={{ width: '100%' }}>
      <Card
        padding="md"
        radius="md"
        withBorder
        bg={selected ? `var(--mantine-color-${node.color}-6)` : undefined}
        style={{
          opacity: dimmed ? 0.45 : 1,
          transition: 'opacity 0.15s ease, background-color 0.15s ease',
          borderColor: selected
            ? `var(--mantine-color-${node.color}-6)`
            : `var(--mantine-color-${node.color}-3)`,
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <Text
          fw={600}
          size="md"
          c={selected ? 'white' : `${node.color}.7`}
        >
          {node.label}
        </Text>
      </Card>
    </UnstyledButton>
  )
}
