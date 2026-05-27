# Mood Journal

A personal app for tracking mood and journal entries over time.

## Core Principles

### I. Code Quality

All production code MUST be clean, readable, and maintainable. Every function and module MUST have
a single, clear responsibility. Code MUST pass linting and static analysis with zero errors before
committing. Dependencies MUST be explicit and minimized; unused imports and dead code are not
permitted. Every abstraction beyond what the immediate task requires MUST be justified — undocumented
complexity is a defect.

### II. Testing Standards

Every feature MUST include tests covering the happy path and all documented edge cases. Integration
tests MUST cover all cross-boundary interactions: API contracts, database writes, and external
service calls. Test coverage MUST NOT regress; removing tests requires documented justification.

### III. User Experience Consistency

All UI interactions MUST follow the established design patterns and component conventions — no
one-off patterns without documented rationale. Error messages MUST be human-readable, actionable,
and formatted consistently. Every user-facing flow MUST handle loading, empty, and error states;
shipping a flow with unhandled states is a defect, not a deferred task.

### IV. Performance Requirements

All user-facing operations MUST complete within defined latency budgets. Default budgets:
API responses ≤ 200 ms at p95; page or screen loads ≤ 2 s on a standard connection.
Performance regressions MUST be treated as blocking defects, not warnings.
Background and batch operations are exempt from interactive latency budgets but MUST define
explicit throughput or completion-time targets before work starts.

## Quality Gates

Before committing, all of the following MUST pass:

- Linting and static analysis: zero errors
- All existing tests pass; no test deletions without documented justification
- New code has accompanying tests
- No performance budget regressions
- Every user-facing flow handles loading, empty, and error states
- Zero unresolved `TODO(<FIELD_NAME>)` markers in code that ships to production
- Any abstraction beyond the immediate task is justified in a comment

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript, Vite 8 |
| UI | Mantine v7 (`@mantine/core`, `@mantine/hooks`, `@mantine/form`) |
| Forms | `mantine-form-zod-resolver` + Zod v3 |
| Auth | Google Identity Services (GIS) token client |
| Data | Google Sheets REST API |
| Testing | Vitest + Testing Library |
| Deploy | GitHub Pages (`npm run deploy`) |

## Commands

```
npm run dev        # start dev server
npm run build      # production build (Vite/esbuild — does NOT type-check)
npm run typecheck  # tsc --noEmit (run this for type errors; build won't catch them)
npm run lint       # ESLint
npm run test       # Vitest watch mode
npm run test:run   # Vitest single run (used in CI / pre-commit checks)
npm run deploy     # build then push dist/ to gh-pages branch
```

## Source Layout

```
src/
  data/emotions.ts          bundled emotion tree + resolveColor helper
  models/moodEntry.ts       MoodEntry type (incl. local-only syncStatus field), Zod schema, factory, row helpers
  services/googleSheets.ts  readEntries, appendEntry, initSheet, createSpreadsheet
  services/syncReconciler.ts pure helpers: getPendingToSync, buildMergedEntries, dedupeById
  services/syncEngine.ts    framework-agnostic sync: single-flight runSync + add/update/delete; shared in-flight set gives at-most-once append
  hooks/useGoogleAuth.ts    GIS token client; mints a short-lived access token on each user-triggered Sync (no background refresh)
  hooks/useEntries.ts       thin React adapter over syncEngine; optimistic dispatch + consumes Auth + EntriesContext
  context/AuthContext.tsx   auth state machine (idle|authorising|authorised|error)
  context/EntriesContext.tsx entries state machine; loads from localStorage on mount
  lib/crypto.ts             AES-GCM encrypt/decrypt; key stored in IndexedDB
  lib/storage.ts            localStorage helpers; encrypted entries + sheet ref
  components/
    SyncBar.tsx             fixed bottom bar: Drive sync button, sheet setup modal
    LogView/                3-step emotion picker + note + date + save
    HistoryView/            reverse-chronological entry list
  types/google.d.ts         minimal Window augmentation for GIS + Drive Picker
tests/
  unit/models/              moodEntry pure function tests
  unit/lib/                 storage and crypto tests
  unit/services/            syncReconciler + syncEngine tests
  integration/              googleSheets fetch-mock tests
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:
- `VITE_GOOGLE_CLIENT_ID` — OAuth 2.0 client ID from Google Cloud Console
- `VITE_GOOGLE_API_KEY` — API key for the Drive Picker UI

## Reference

A structurally identical app (`arc`) lives at `/Users/andyh/Claude/arc`. When adapting patterns — auth flow, Sheets service, test structure — read that project first.

## Git commits

Never include AI attribution in commit messages. Do not add `Co-Authored-By`, `Generated-by`, or any other trailer or note that identifies an AI tool as a contributor.

## Session Self-Evaluation

At the end of each session, evaluate how well these instructions served the work and offer concrete suggestions for improvement. Specifically consider:

- Were any instructions missing, ambiguous, or contradicted each other?
- Did you need to discover something (a command, a file location, a convention) that should be documented here?
- Did any instruction cause unnecessary friction or repeated tool calls?
- Is the tech stack, source layout, or commands section still accurate?

Always present suggestions as specific proposed diffs — not vague observations — even when auto-committing.

**Committing self-improvement suggestions**: For each suggestion, show the proposed diff. If it is a pure addition (new section, new rule, new convention — no existing text modified or removed) and you are certain it is correct and beneficial, apply it and commit immediately. If it modifies or removes any existing content, wait for explicit approval before committing.
