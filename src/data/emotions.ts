export type MantineColor = string

export interface EmotionNode {
  label: string
  color?: MantineColor
  children?: EmotionNode[]
}

export type EmotionTree = EmotionNode[]

export const EMOTIONS: EmotionTree = [
  {
    label: 'Angry',
    color: 'red',
    children: [
      {
        label: 'Let Down',
        children: [{ label: 'Betrayed' }, { label: 'Resentful' }],
      },
      {
        label: 'Humiliated',
        children: [{ label: 'Disrespected' }, { label: 'Ridiculed' }],
      },
      {
        label: 'Bitter',
        children: [{ label: 'Indignant' }, { label: 'Violated' }],
      },
      {
        label: 'Mad',
        children: [{ label: 'Furious' }, { label: 'Jealous' }],
      },
      {
        label: 'Aggressive',
        children: [{ label: 'Provoked' }, { label: 'Hostile' }],
      },
      {
        label: 'Frustrated',
        children: [{ label: 'Infuriated' }, { label: 'Annoyed' }],
      },
      {
        label: 'Distant',
        children: [{ label: 'Withdrawn' }, { label: 'Numb' }],
      },
      {
        label: 'Critical',
        children: [{ label: 'Dismissive' }, { label: 'Skeptical' }],
      },
    ],
  },
  {
    label: 'Fearful',
    color: 'violet',
    children: [
      {
        label: 'Scared',
        children: [{ label: 'Helpless' }, { label: 'Frightened' }],
      },
      {
        label: 'Anxious',
        children: [{ label: 'Overwhelmed' }, { label: 'Worried' }],
      },
      {
        label: 'Insecure',
        children: [{ label: 'Inferior' }, { label: 'Worthless' }],
      },
      {
        label: 'Weak',
        children: [{ label: 'Vulnerable' }, { label: 'Victimised' }],
      },
      {
        label: 'Rejected',
        children: [{ label: 'Excluded' }, { label: 'Persecuted' }],
      },
      {
        label: 'Threatened',
        children: [{ label: 'Nervous' }, { label: 'Exposed' }],
      },
    ],
  },
  {
    label: 'Disgusted',
    color: 'teal',
    children: [
      {
        label: 'Disapproving',
        children: [{ label: 'Judgmental' }, { label: 'Embarrassed' }],
      },
      {
        label: 'Disappointed',
        children: [{ label: 'Appalled' }, { label: 'Revolted' }],
      },
      {
        label: 'Awful',
        children: [{ label: 'Nauseated' }, { label: 'Detestable' }],
      },
      {
        label: 'Repelled',
        children: [{ label: 'Horrified' }, { label: 'Hesitant' }],
      },
    ],
  },
  {
    label: 'Sad',
    color: 'blue',
    children: [
      {
        label: 'Hurt',
        children: [{ label: 'Embarrassed' }, { label: 'Devastated' }],
      },
      {
        label: 'Depressed',
        children: [{ label: 'Empty' }, { label: 'Inferior' }],
      },
      {
        label: 'Guilty',
        children: [{ label: 'Remorseful' }, { label: 'Ashamed' }],
      },
      {
        label: 'Despair',
        children: [{ label: 'Powerless' }, { label: 'Grief' }],
      },
      {
        label: 'Vulnerable',
        children: [{ label: 'Fragile' }, { label: 'Victimised' }],
      },
      {
        label: 'Lonely',
        children: [{ label: 'Abandoned' }, { label: 'Isolated' }],
      },
    ],
  },
  {
    label: 'Happy',
    color: 'yellow',
    children: [
      {
        label: 'Playful',
        children: [{ label: 'Aroused' }, { label: 'Cheeky' }],
      },
      {
        label: 'Content',
        children: [{ label: 'Free' }, { label: 'Joyful' }],
      },
      {
        label: 'Interested',
        children: [{ label: 'Curious' }, { label: 'Inquisitive' }],
      },
      {
        label: 'Proud',
        children: [{ label: 'Successful' }, { label: 'Confident' }],
      },
      {
        label: 'Accepted',
        children: [{ label: 'Respected' }, { label: 'Valued' }],
      },
      {
        label: 'Powerful',
        children: [{ label: 'Courageous' }, { label: 'Creative' }],
      },
      {
        label: 'Peaceful',
        children: [{ label: 'Hopeful' }, { label: 'Inspired' }],
      },
      {
        label: 'Trusting',
        children: [{ label: 'Sensitive' }, { label: 'Intimate' }],
      },
      {
        label: 'Optimistic',
        children: [{ label: 'Hopeful' }, { label: 'Excited' }],
      },
    ],
  },
  {
    label: 'Surprised',
    color: 'orange',
    children: [
      {
        label: 'Startled',
        children: [{ label: 'Shocked' }, { label: 'Dismayed' }],
      },
      {
        label: 'Confused',
        children: [{ label: 'Disillusioned' }, { label: 'Perplexed' }],
      },
      {
        label: 'Amazed',
        children: [{ label: 'Astonished' }, { label: 'Awe' }],
      },
      {
        label: 'Excited',
        children: [{ label: 'Eager' }, { label: 'Energetic' }],
      },
    ],
  },
  {
    label: 'Bad',
    color: 'gray',
    children: [
      {
        label: 'Bored',
        children: [{ label: 'Indifferent' }, { label: 'Apathetic' }],
      },
      {
        label: 'Busy',
        children: [{ label: 'Pressured' }, { label: 'Rushed' }],
      },
      {
        label: 'Stressed',
        children: [{ label: 'Overwhelmed' }, { label: 'Out of Control' }],
      },
      {
        label: 'Tired',
        children: [{ label: 'Sleepy' }, { label: 'Unfocussed' }],
      },
      {
        label: 'Unwell',
        children: [{ label: 'Sick' }, { label: 'Run Down' }],
      },
    ],
  },
]

export function resolveColor(label: string): MantineColor {
  for (const root of EMOTIONS) {
    if (root.label === label) return root.color ?? 'gray'
    if (root.children) {
      for (const child of root.children) {
        if (child.label === label) return root.color ?? 'gray'
        if (child.children) {
          for (const grandchild of child.children) {
            if (grandchild.label === label) return root.color ?? 'gray'
          }
        }
      }
    }
  }
  return 'gray'
}
