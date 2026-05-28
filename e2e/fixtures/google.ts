import type { Page } from '@playwright/test'

const FAKE_SHEET_ID = 'fake-sheet-id'
const SHEET_REF_KEY = 'mood-journal-spreadsheet:v1'
const HEADER = ['id', 'date', 'level1', 'level2', 'level3', 'note', 'createdAt']

export interface SheetMock {
  appendCount(): number
  rows(): string[][]
}

/**
 * Sets up all Google-related mocks for a Playwright test:
 *
 * 1. Pre-seeds localStorage with a fake sheetRef so EntriesContext has a
 *    sheetId from the first render and the "Set up Google Drive" modal is skipped.
 *
 * 2. Injects a stub window.google.accounts.oauth2 via addInitScript so
 *    useGoogleAuth.initiateAuth fires the token callback synchronously without
 *    needing the real GIS library. Each call gets a unique token so the
 *    accessToken dep in EntriesContext changes and the reconcile effect re-fires
 *    on every subsequent Sync press.
 *
 * 3. Routes all sheets.googleapis.com requests to a stateful in-memory sheet so
 *    tests can run without a real Google account.
 */
export async function setupGoogleMocks(
  page: Page,
  options: { initialRows?: string[][] } = {},
): Promise<SheetMock> {
  const sheetRows: string[][] = [...(options.initialRows ?? [])]
  let appendCallCount = 0

  await page.addInitScript(
    ({ key, ref }: { key: string; ref: { id: string; title: string } }) => {
      localStorage.setItem(key, JSON.stringify(ref))
    },
    { key: SHEET_REF_KEY, ref: { id: FAKE_SHEET_ID, title: 'Mood Journal' } },
  )

  await page.addInitScript(() => {
    let counter = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).google = {
      accounts: {
        oauth2: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initTokenClient: (cfg: any) => ({
            requestAccessToken: () =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              cfg.callback({ access_token: `fake-token-${++counter}` }),
          }),
        },
      },
    }
  })

  await page.route('https://accounts.google.com/gsi/client', (route) => route.abort())

  await page.route('https://sheets.googleapis.com/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (method === 'GET' && url.includes('/values/')) {
      await route.fulfill({
        json: url.includes('!A:A')
          ? { values: [['id'], ...sheetRows.map((r) => [r[0]])] }
          : { values: [HEADER, ...sheetRows] },
      })
      return
    }

    if (url.includes(':append')) {
      const body = JSON.parse(route.request().postData() ?? '{}') as {
        values?: string[][]
      }
      if (body.values) sheetRows.push(...body.values)
      appendCallCount++
      await route.fulfill({ json: { updates: {} } })
      return
    }

    await route.fulfill({
      json: {
        spreadsheetId: FAKE_SHEET_ID,
        sheets: [{ properties: { title: 'Entries', sheetId: 0 } }],
      },
    })
  })

  return {
    appendCount: () => appendCallCount,
    rows: () => [...sheetRows],
  }
}
