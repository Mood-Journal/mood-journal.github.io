---
name: project-stack
description: Tech stack, file layout, and key architectural decisions for Mood Journal
metadata:
  type: project
---

React 19 + TypeScript + Vite 8 app. Mantine v7 for UI. Zod v3 for validation. Google Identity Services (GIS) for OAuth. Google Sheets REST API for data storage.

**Why:** New project scaffolded from docs/spec.md, mirroring Arc project at /Users/andyh/Claude/arc.

**How to apply:** Refer to this when adding features — no Tailwind, no shadcn/ui, Mantine only. Base URL is `/mood-journal/` for GitHub Pages.

## File layout
```
src/
  data/emotions.ts        — 7-root emotion tree (EMOTIONS export + resolveColor)
  models/moodEntry.ts     — MoodEntry type, moodEntryFieldsSchema (Zod), factory, row helpers
  services/googleSheets.ts — readEntries, appendEntry, initSheet, createSpreadsheet
  hooks/useGoogleAuth.ts   — GIS token client, silent restore, proactive refresh
  hooks/useEntries.ts      — load + addEntry via EntriesContext + AuthContext
  context/AuthContext.tsx  — states: idle|restoring|authorising|authorised|error
  context/EntriesContext.tsx — states: idle|loading|loaded|saving|error
  lib/storage.ts           — localStorage: mood-journal-spreadsheet:v1, mood-journal-session-hint:v1
  components/
    SetupScreen.tsx         — sign-in + Drive Picker + create/connect sheet gate
    LogView/                — 3-step emotion selection + note + date + save
    HistoryView/            — reverse-chron entry list
tests/
  unit/models/moodEntry.test.ts
  unit/lib/storage.test.ts
  integration/googleSheets.test.ts
```

## Env vars required
- VITE_GOOGLE_CLIENT_ID — OAuth 2.0 client ID
- VITE_GOOGLE_API_KEY — Google API key (for Drive Picker)
