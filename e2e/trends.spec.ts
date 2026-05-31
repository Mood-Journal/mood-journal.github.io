import { test, expect } from '@playwright/test'
import { setupGoogleMocks } from './fixtures/google'

// Two synced rows from the cloud, both Angry, on different days.
// Column order: id, date, level1, level2, level3, note, createdAt
const SEED_ROWS = [
  ['seed-1', '2026-05-26', 'Angry', '', '', 'rough morning', '2026-05-26T09:00:00.000Z'],
  ['seed-2', '2026-05-27', 'Angry', '', '', 'still rough', '2026-05-27T09:00:00.000Z'],
]

test('Trends tab shows the empty state with no entries', async ({ page }) => {
  await setupGoogleMocks(page)
  await page.goto('/#trends')

  await expect(
    page.getByText('Your mood trend will appear here once you start logging entries.'),
  ).toBeVisible()
  await expect(page.getByText("What we're noticing")).toHaveCount(0)
})

test('Trends tab surfaces insights once entries exist', async ({ page }) => {
  await setupGoogleMocks(page, { initialRows: SEED_ROWS })
  await page.goto('/')

  // Pull the seeded rows into local state.
  await page.getByRole('button', { name: 'Sync with Google Drive' }).click()
  await expect(page.getByText('Synced with Google Drive.')).toBeVisible()

  await page.getByRole('tab', { name: 'Trends' }).click()

  await expect(page.getByText("What we're noticing")).toBeVisible()
  await expect(
    page.getByText('Angry was your most logged feeling — 2 of 2 entries (100%).'),
  ).toBeVisible()
  await expect(
    page.getByText("You've logged 2 entries across 2 days, covering 1 different feeling."),
  ).toBeVisible()
})
