# Mood Journal

A personal app for tracking mood and journal entries over time. Entries are stored locally on your device and can be backed up to Google Drive via Google Sheets.

## Features

- **Emotion picker** — 3-level emotion tree (e.g. Angry → Bitter → Violated) with colour-coded categories
- **Journal notes** — optional free-text note per entry, with a date picker
- **History view** — reverse-chronological list of all entries
- **Local-first storage** — entries are encrypted with AES-GCM and stored in IndexedDB; nothing leaves your device unless you sync
- **Google Drive sync** — optional backup to a Google Sheets spreadsheet in your own Drive; works offline and syncs on demand

## Getting Started

### Prerequisites

- Node.js 20+
- A Google Cloud project with the Sheets API and Drive API enabled

### Google Cloud setup

1. Create an OAuth 2.0 Client ID (Web application type) in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add your dev origin (`http://localhost:5173`) and your production URL to the list of authorised JavaScript origins.
2. Create an API Key and restrict it to the Google Picker API.

### Local development

```bash
cp .env.example .env.local
# Fill in VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in .env.local

npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### First sync

On first use, tap **Sync with Google Drive** in the bottom bar. After authorising with Google you will be prompted to either:
- **Create Mood Journal** — creates a new spreadsheet named "Mood Journal" in your Drive
- **Browse Drive** — connect an existing spreadsheet

Subsequent syncs use the same spreadsheet and only push changes made since the last sync.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (does not type-check) |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest single run |
| `npm run test:e2e` | Playwright e2e tests (starts dev server automatically) |
| `npm run deploy` | Build and push to the `gh-pages` branch |

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript, Vite 8 |
| UI | Mantine v9 |
| Auth | Google Identity Services (GIS) token client |
| Data | Google Sheets REST API |
| Local storage | IndexedDB (encrypted) + localStorage (sheet reference) |
| Testing | Vitest + Testing Library; Playwright |
| Deploy | GitHub Pages |

## Privacy

All entries are encrypted with a per-device AES-GCM key before being written to storage. The key never leaves your device. When you sync, entries are decrypted in memory and sent directly to your own Google Sheets spreadsheet — nothing passes through any intermediate server.

## Deployment

```bash
npm run deploy
```

This builds the app and pushes `dist/` to the `gh-pages` branch. Set `base` in `vite.config.ts` to your repository path if hosting on GitHub Pages under a sub-path.
