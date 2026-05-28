import { test, expect, type Page } from '@playwright/test'
import { setupGoogleMocks } from './fixtures/google'

async function createEntry(page: Page, note: string) {
  await page.getByRole('button', { name: 'Angry' }).click()
  await page.getByRole('button', { name: 'Skip →' }).click()
  await page.getByLabel('Note (optional)').fill(note)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved!')).toBeVisible()
  // Wait for the 1.5 s auto-reset before interacting with the form again
  await expect(page.getByRole('heading', { name: 'How are you feeling?' })).toBeVisible()
}

// A pre-existing row in the sheet, as if synced from another device.
// Column order: id, date, level1, level2, level3, note, createdAt
const SHEET_SEED_ROW = [
  'seed-entry-id-0001',
  '2026-05-27',
  'Angry',
  '',
  '',
  'Entry from the cloud',
  '2026-05-27T09:00:00.000Z',
]

test('entry deleted from sheet is removed locally on sync', async ({ page }) => {
  const sheet = await setupGoogleMocks(page, { initialRows: [SHEET_SEED_ROW] })
  await page.goto('/')

  await page.getByRole('tab', { name: 'History' }).click()

  // First sync: pulls the seed row into local state as synced
  await page.getByRole('button', { name: 'Sync with Google Drive' }).click()
  await expect(page.getByText('Synced with Google Drive.')).toBeVisible()
  await expect(page.getByText('Entry from the cloud')).toHaveCount(1)

  // Simulate remote deletion — row is gone from the sheet before the next sync
  sheet.deleteRow(SHEET_SEED_ROW[0])
  expect(sheet.rows()).toHaveLength(0)

  // Second sync: synced entry absent from the sheet is dropped from local state
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect(page.getByText('Synced with Google Drive.')).toBeVisible()
  await expect(page.getByText('Entry from the cloud')).toHaveCount(0)
})

test('creates entry, syncs once, no duplicates on second sync', async ({ page }) => {
  const sheet = await setupGoogleMocks(page, { initialRows: [SHEET_SEED_ROW] })
  await page.goto('/')

  // --- Create entry ---
  // Level-1: pick Angry
  await page.getByRole('button', { name: 'Angry' }).click()
  // Level-2: skip straight to note step
  await page.getByRole('button', { name: 'Skip →' }).click()
  await page.getByLabel('Note (optional)').fill('Playwright test entry')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved!')).toBeVisible()

  // Wait for the 1.5 s auto-reset so the form is clear before we switch tabs
  await expect(
    page.getByRole('heading', { name: 'How are you feeling?' }),
  ).toBeVisible()

  // Switch to History and confirm only the locally-created entry is visible
  // (the sheet entry hasn't been pulled down yet)
  await page.getByRole('tab', { name: 'History' }).click()
  const localNote = page.getByText('Playwright test entry')
  const cloudNote = page.getByText('Entry from the cloud')
  await expect(localNote).toHaveCount(1)
  await expect(cloudNote).toHaveCount(0)

  // --- First sync ---
  // The local pending entry is pushed to the sheet; the sheet's existing entry
  // is pulled down and merged. Both entries should be in the history after sync.
  await page.getByRole('button', { name: 'Sync with Google Drive' }).click()
  await expect(page.getByText('Synced with Google Drive.')).toBeVisible()

  expect(sheet.appendCount()).toBe(1)          // only the new local entry was pushed
  expect(sheet.rows()).toHaveLength(2)          // seed row + appended row
  await expect(localNote).toHaveCount(1)
  await expect(cloudNote).toHaveCount(1)

  // --- Second sync: nothing to push, nothing should change ---
  const readRequest = page.waitForRequest(
    (req) => req.url().includes('sheets.googleapis.com') && req.method() === 'GET',
  )
  await page.getByRole('button', { name: 'Sync now' }).click()
  await (await readRequest).response()

  expect(sheet.appendCount()).toBe(1)          // no new appends
  expect(sheet.rows()).toHaveLength(2)          // no duplicate rows

  await expect(page.getByText('Synced with Google Drive.')).toBeVisible()
  await expect(localNote).toHaveCount(1)
  await expect(cloudNote).toHaveCount(1)
})

test('deleting a synced entry removes it from the sheet immediately', async ({ page }) => {
  const sheet = await setupGoogleMocks(page, { initialRows: [SHEET_SEED_ROW] })
  await page.goto('/')

  await page.getByRole('tab', { name: 'History' }).click()

  // Pull the cloud entry down and mark it synced
  await page.getByRole('button', { name: 'Sync with Google Drive' }).click()
  await expect(page.getByText('Synced with Google Drive.')).toBeVisible()
  await expect(page.getByText('Entry from the cloud')).toHaveCount(1)
  expect(sheet.rows()).toHaveLength(1)

  // Open the entry card → ViewModal → Edit → EditModal (opens at note step)
  await page.getByText('Entry from the cloud').click()
  await page.getByRole('button', { name: 'Edit' }).click()

  // Track the batchUpdate delete request before clicking Delete
  const deleteReq = page.waitForRequest(
    (req) => req.method() === 'POST' && req.url().includes(':batchUpdate'),
  )
  await page.getByRole('button', { name: 'Delete' }).click() // shows confirm panel
  await page.getByRole('button', { name: 'Delete' }).click() // confirms deletion
  await (await deleteReq).response()

  await expect(page.getByText('Entry from the cloud')).toHaveCount(0)
  expect(sheet.rows()).toHaveLength(0)
  expect(sheet.deleteCount()).toBe(1)
})
