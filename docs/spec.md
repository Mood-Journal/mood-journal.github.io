# Mood Journal — Specification

## Purpose

Mood Journal is a personal web app for logging and reflecting on emotional states over time. Its
distinguishing feature is a guided, three-level emotion selection flow: the user picks a broad
feeling, then narrows to a more specific emotion, then (optionally) to a precise nuance. The
selection process itself is the core value — it teaches emotional vocabulary and encourages
self-reflection rather than reducing mood to a number.

---

## User Stories

| ID | Story |
|---|---|
| US-1 | As a user, I want to log how I am feeling right now by choosing from a list of emotions, so that I build a record of my emotional state over time. |
| US-2 | As a user, I want to be guided from a broad emotion to a more specific one, so that I can identify my feeling with precision even when I don't know the right word. |
| US-3 | As a user, I want to add a short note to a mood entry, so that I can capture the context that produced the feeling. |
| US-4 | As a user, I want to see a chronological list of my past entries, so that I can review patterns in my mood. |
| US-5 | As a user, I want my data to be stored in my own Google Sheet, so that I own and control my journal and can export it at any time. |
| US-6 | As a user, I want to sign in with my Google account so that the app can read and write to my spreadsheet without requiring a backend server. |

---

## Emotion Taxonomy

The taxonomy is a tree with exactly three levels. Every level-1 node is a primary emotion. Every
level-2 node is a child of a level-1 node. Every level-3 node is a child of a level-2 node.

The taxonomy is bundled in the app as a TypeScript data file (`src/data/emotions.ts`). It is
**not** stored in the spreadsheet; the sheet only stores entries.

### Bundled taxonomy (seed data)

The default taxonomy is derived from the Feelings Wheel (Gloria Willcox). Only a representative
excerpt is shown here; the full set is in `src/data/emotions.ts`.

```
Angry
  ├── Let Down
  │   ├── Betrayed
  │   └── Resentful
  ├── Humiliated
  │   ├── Disrespected
  │   └── Ridiculed
  ├── Bitter
  │   ├── Indignant
  │   └── Violated
  ├── Mad
  │   ├── Furious
  │   └── Jealous
  ├── Aggressive
  │   ├── Provoked
  │   └── Hostile
  ├── Frustrated
  │   ├── Infuriated
  │   └── Annoyed
  ├── Distant
  │   ├── Withdrawn
  │   └── Numb
  └── Critical
      ├── Dismissive
      └── Skeptical

Fearful
  ├── Scared
  │   ├── Helpless
  │   └── Frightened
  ├── Anxious
  │   ├── Overwhelmed
  │   └── Worried
  ├── Insecure
  │   ├── Inferior
  │   └── Worthless
  ├── Weak
  │   ├── Vulnerable
  │   └── Victimised
  ├── Rejected
  │   ├── Excluded
  │   └── Persecuted
  └── Threatened
      ├── Nervous
      └── Exposed

Disgusted
  ├── Disapproving
  │   ├── Judgmental
  │   └── Embarrassed
  ├── Disappointed
  │   ├── Appalled
  │   └── Revolted
  ├── Awful
  │   ├── Nauseated
  │   └── Detestable
  └── Repelled
      ├── Horrified
      └── Hesitant

Sad
  ├── Hurt
  │   ├── Embarrassed
  │   └── Devastated
  ├── Depressed
  │   ├── Empty
  │   └── Inferior
  ├── Guilty
  │   ├── Remorseful
  │   └── Ashamed
  ├── Despair
  │   ├── Powerless
  │   └── Grief
  ├── Vulnerable
  │   ├── Fragile
  │   └── Victimised
  └── Lonely
      ├── Abandoned
      └── Isolated

Happy
  ├── Playful
  │   ├── Aroused
  │   └── Cheeky
  ├── Content
  │   ├── Free
  │   └── Joyful
  ├── Interested
  │   ├── Curious
  │   └── Inquisitive
  ├── Proud
  │   ├── Successful
  │   └── Confident
  ├── Accepted
  │   ├── Respected
  │   └── Valued
  ├── Powerful
  │   ├── Courageous
  │   └── Creative
  ├── Peaceful
  │   ├── Hopeful
  │   └── Inspired
  ├── Trusting
  │   ├── Sensitive
  │   └── Intimate
  └── Optimistic
      ├── Hopeful
      └── Excited

Surprised
  ├── Startled
  │   ├── Shocked
  │   └── Dismayed
  ├── Confused
  │   ├── Disillusioned
  │   └── Perplexed
  ├── Amazed
  │   ├── Astonished
  │   └── Awe
  └── Excited
      ├── Eager
      └── Energetic

Bad
  ├── Bored
  │   ├── Indifferent
  │   └── Apathetic
  ├── Busy
  │   ├── Pressured
  │   └── Rushed
  ├── Stressed
  │   ├── Overwhelmed
  │   └── Out of Control
  ├── Tired
  │   ├── Sleepy
  │   └── Unfocussed
  └── Unwell
      ├── Sick
      └── Run Down
```

### TypeScript shape

```ts
type EmotionNode = {
  label: string
  color: MantineColor  // Mantine palette key, e.g. 'red', 'violet'
  children?: EmotionNode[]  // absent at level 3
}

type EmotionTree = EmotionNode[]  // level-1 roots
```

### Emotion colour mapping

Each level-1 emotion is assigned a Mantine palette colour. That colour cascades to all its
descendants so the whole branch shares a visual identity — mirroring how the Feelings Wheel
uses colour to group related emotions.

| Level-1 emotion | Mantine colour | Hex reference |
|---|---|---|
| Angry | `red` | #fa5252 |
| Fearful | `violet` | #7950f2 |
| Disgusted | `teal` | #12b886 |
| Sad | `blue` | #339af0 |
| Happy | `yellow` | #fcc419 |
| Surprised | `orange` | #ff922b |
| Bad | `gray` | #868e96 |

Level-2 and level-3 nodes inherit their parent's colour. The `color` field is stored on the
level-1 node only; descendants derive it at runtime by walking up to their root.

---

## Data Model

### MoodEntry

The core record. Stored as one row per entry in the `Entries` sheet.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` (UUID v4) | yes | Generated at creation time |
| `date` | `string` (YYYY-MM-DD) | yes | User-supplied; defaults to today |
| `level1` | `string` | yes | Label of the selected level-1 emotion |
| `level2` | `string \| null` | no | Label of the selected level-2 emotion |
| `level3` | `string \| null` | no | Label of the selected level-3 emotion |
| `note` | `string \| null` | no | Free-text, max 500 characters |
| `createdAt` | `string` (ISO 8601) | yes | Set at creation; never updated |

Labels are stored as plain strings (not IDs), so the entry remains readable if the taxonomy ever
changes.

### MoodEntryFields

The subset accepted as user input when creating a new entry:

```ts
type MoodEntryFields = {
  date: string
  level1: string
  level2?: string
  level3?: string
  note?: string
}
```

---

## Google Sheets Schema

The backing spreadsheet (the "Mood Ledger") contains a single tab.

### `Entries` sheet

Columns (in order): `id | date | level1 | level2 | level3 | note | createdAt`

- Row 1 is a header row created by `initSheet`.
- Empty optional fields are stored as empty strings.
- `initSheet` is idempotent — safe to call on every connection.

No `Lookups` sheet is required; the emotion taxonomy lives in the app bundle.

---

## User Flows

### Flow 1 — First-time setup

1. User lands on the app.
2. App shows a single "Sign in with Google" button.
3. After sign-in, app prompts the user to either:
   - **Create a new Mood Ledger** — app creates a new spreadsheet in the user's Drive, calls
     `initSheet`, saves the `SheetRef` to `localStorage`.
   - **Connect an existing one** — user picks a spreadsheet via the Google Drive Picker; app calls
     `initSheet` and saves the `SheetRef`.
4. App transitions to the main logging screen.

### Flow 2 — Log a mood (primary flow)

1. User opens the app; the "Log" view is shown by default.
2. **Step 1 – Level-1 selection**: all seven primary emotions are displayed as large, tappable
   cards. User taps one. The selection is highlighted; all other cards dim.
3. **Step 2 – Level-2 selection**: the children of the selected level-1 emotion slide in below (or
   replace the level-1 grid). User taps one, or taps "Skip".
4. **Step 3 – Level-3 selection**: the children of the selected level-2 emotion appear. User taps
   one, or taps "Skip".
5. A text area for an optional note is shown beneath the selections.
6. The date field defaults to today; the user can change it.
7. User taps "Save". The entry is validated, appended to the sheet, and added to local state.
8. A confirmation is shown briefly, then the form resets.

### Flow 3 — View history

1. User navigates to the "History" view (bottom nav or tab).
2. Entries are listed in reverse-chronological order.
3. Each row shows: date, the deepest selected emotion label (level3 → level2 → level1 fallback),
   and a truncated note preview.
4. Loading, empty, and error states are all handled.

---

## UI Layout

### Navigation

A simple tab/nav bar with two destinations: **Log** (default) and **History**.

### Log view

```
┌─────────────────────────────────────┐
│  How are you feeling?               │
│                                     │
│  [Angry] [Fearful] [Disgusted]      │
│  [Sad]   [Happy]   [Surprised]      │
│                [Bad]                │
│                                     │
│  ─── (after level-1 selected) ───   │
│                                     │
│  [Scared] [Anxious] [Insecure] ...  │
│                     [Skip →]        │
│                                     │
│  ─── (after level-2 selected) ───   │
│                                     │
│  [Inferior] [Worthless]  [Skip →]   │
│                                     │
│  Note (optional)                    │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  Date: [2026-05-24]                 │
│                                     │
│               [Save]                │
└─────────────────────────────────────┘
```

### History view

```
┌─────────────────────────────────────┐
│  Your entries                       │
│                                     │
│  24 May 2026  Inferior              │
│  (Fearful › Insecure › Inferior)    │
│  "Meeting went badly..."            │
│                                     │
│  23 May 2026  Content               │
│  (Happy › Content)                  │
│                                     │
│  ...                                │
└─────────────────────────────────────┘
```

---

## Auth Flow

Identical to Arc:

- Google Identity Services (GIS) token client, loaded client-side.
- Scopes: `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive.file` (the latter for the Drive Picker).
- Short-lived access token held in memory only; expires after ~1 hour.
- `SheetRef` (`{ id: string; title: string }`) persisted in `localStorage` under key `mood-journal-spreadsheet:v1`.

---

## Tech Stack

Mirrors Arc except for the UI layer, which replaces Tailwind + shadcn/ui with Mantine.

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript, Vite |
| UI & styling | Mantine v7 (`@mantine/core`, `@mantine/hooks`) |
| Forms | `@mantine/form` + Zod (via `mantine-form-zod-resolver`) |
| Auth | Google Identity Services (GIS) |
| Data | Google Sheets REST API |
| Testing | Vitest + Testing Library |
| Deploy | GitHub Pages (`npm run deploy`) |

Mantine ships its own CSS (imported once in `main.tsx` via `@mantine/core/styles.css`) and
does **not** use Tailwind. Spacing, colour tokens, and responsive breakpoints come from the
Mantine theme object configured in `MantineProvider` at the app root.

---

## Architecture

Mirrors Arc's layered structure:

| Layer | Path | Responsibility |
|---|---|---|
| Data | `src/data/emotions.ts` | Bundled emotion tree with colour assignments |
| Models | `src/models/moodEntry.ts` | Types, factory, Zod schema, validation |
| Services | `src/services/googleSheets.ts` | Sheets API wrapper |
| Hooks | `src/hooks/` | `useGoogleAuth`, `useEntries` |
| Context | `src/context/` | `AuthContext`, `EntriesContext` |
| Components | `src/components/` | UI, split by feature |
| Storage | `src/lib/storage.ts` | `localStorage` helpers for `SheetRef` |

### Mantine setup

`MantineProvider` wraps the entire app in `main.tsx`. A custom theme extends the default
Mantine theme with the app's primary colour and any global style overrides:

```tsx
// main.tsx
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'

const theme = createTheme({
  primaryColor: 'violet',
  fontFamily: 'Geist, sans-serif',
})

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme}>
    <App />
  </MantineProvider>
)
```

### State machines

**Auth** — same four states as Arc: `idle | authorising | authorised | error`.

**Entries** — same five states as Arc: `idle | loading | loaded | saving | error`.

---

## Out of Scope (v1)

The following are explicitly deferred to keep v1 focused:

- Trends charts / mood visualisations
- Reminders / notifications
- Editing or deleting past entries
- Multiple journals / spreadsheets
- Offline support or sync conflict resolution
- User-editable emotion taxonomy
- Search or filtering of history
- Export (the raw spreadsheet serves this need)
