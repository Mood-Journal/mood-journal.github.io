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
        children: [{ label: 'Sceptical' }, { label: 'Dismissive' }],
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
        children: [{ label: 'Inadequate' }, { label: 'Inferior' }],
      },
      {
        label: 'Weak',
        children: [{ label: 'Worthless' }, { label: 'Insignificant' }],
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
        label: 'Awful',
        children: [{ label: 'Nauseated' }, { label: 'Detestable' }],
      },
      {
        label: 'Repelled',
        children: [{ label: 'Horrified' }, { label: 'Hesitant' }],
      },
      {
        label: 'Disappointed',
        children: [{ label: 'Appalled' }, { label: 'Revolted' }],
      },
    ],
  },
  {
    label: 'Sad',
    color: 'blue',
    children: [
      {
        label: 'Lonely',
        children: [{ label: 'Isolated' }, { label: 'Abandoned' }],
      },
      {
        label: 'Vulnerable',
        children: [{ label: 'Fragile' }, { label: 'Victimised' }],
      },
      {
        label: 'Despair',
        children: [{ label: 'Grief' }, { label: 'Powerless' }],
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
        label: 'Hurt',
        children: [{ label: 'Disappointed' }, { label: 'Embarrassed' }],
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
        children: [{ label: 'Loving' }, { label: 'Thankful' }],
      },
      {
        label: 'Trusting',
        children: [{ label: 'Sensitive' }, { label: 'Intimate' }],
      },
      {
        label: 'Optimistic',
        children: [{ label: 'Hopeful' }, { label: 'Inspired' }],
      },
    ],
  },
  {
    label: 'Surprised',
    color: 'orange',
    children: [
      {
        label: 'Excited',
        children: [{ label: 'Eager' }, { label: 'Energetic' }],
      },
      {
        label: 'Amazed',
        children: [{ label: 'Astonished' }, { label: 'Awe' }],
      },
      {
        label: 'Confused',
        children: [{ label: 'Disillusioned' }, { label: 'Perplexed' }],
      },
      {
        label: 'Startled',
        children: [{ label: 'Shocked' }, { label: 'Dismayed' }],
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
        label: 'Tired',
        children: [{ label: 'Sleepy' }, { label: 'Unfocused' }],
      },
      {
        label: 'Busy',
        children: [{ label: 'Pressured' }, { label: 'Rushed' }],
      },
      {
        label: 'Stressed',
        children: [{ label: 'Overwhelmed' }, { label: 'Out of Control' }],
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
