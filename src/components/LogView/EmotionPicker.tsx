import { Button, Group } from '@mantine/core'
import type { EmotionNode, MantineColor } from '@/data/emotions'

interface EmotionPickerProps {
  nodes: EmotionNode[]
  color: MantineColor
  selected: string | null
  onSelect: (label: string) => void
  label: string
}

export default function EmotionPicker({
  nodes,
  color,
  selected,
  onSelect,
  label,
}: EmotionPickerProps) {
  return (
    <Group gap="xs" aria-label={label} role="group">
      {nodes.map((node) => {
        const isSelected = selected === node.label
        const isDimmed = selected !== null && !isSelected
        return (
          <Button
            key={node.label}
            color={color}
            variant={isSelected ? 'filled' : 'light'}
            opacity={isDimmed ? 0.45 : 1}
            onClick={() => onSelect(node.label)}
            size="sm"
          >
            {node.label}
          </Button>
        )
      })}
    </Group>
  )
}
