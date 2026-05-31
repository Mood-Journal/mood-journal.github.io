import { test, expect } from '@playwright/test'
import { setupGoogleMocks } from './fixtures/google'

const selectedTab = (name: string) =>
  ({ name, selected: true }) as const

test('browser back button navigates between visited tabs', async ({ page }) => {
  await setupGoogleMocks(page)
  await page.goto('/')

  // Starts on Log
  await expect(page.getByRole('tab', selectedTab('Log'))).toBeVisible()

  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('tab', selectedTab('History'))).toBeVisible()

  await page.getByRole('tab', { name: 'Trends' }).click()
  await expect(page.getByRole('tab', selectedTab('Trends'))).toBeVisible()

  // Back: Trends -> History
  await page.goBack()
  await expect(page.getByRole('tab', selectedTab('History'))).toBeVisible()

  // Back: History -> Log
  await page.goBack()
  await expect(page.getByRole('tab', selectedTab('Log'))).toBeVisible()

  // Forward: Log -> History
  await page.goForward()
  await expect(page.getByRole('tab', selectedTab('History'))).toBeVisible()
})

test('a bookmarked tab hash opens that tab on load', async ({ page }) => {
  await setupGoogleMocks(page)
  await page.goto('/#trends')

  await expect(page.getByRole('tab', selectedTab('Trends'))).toBeVisible()
})

test('an unknown hash falls back to the default tab', async ({ page }) => {
  await setupGoogleMocks(page)
  await page.goto('/#nonsense')

  await expect(page.getByRole('tab', selectedTab('Log'))).toBeVisible()
})
