import { type MoodEntry, rowToMoodEntry, moodEntryToRow } from '@/models/moodEntry'

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets'
const SHEET_NAME = 'Entries'
const RANGE = `${SHEET_NAME}!A:G`
const HEADER = ['id', 'date', 'level1', 'level2', 'level3', 'note', 'createdAt']

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

export async function readEntries(
  spreadsheetId: string,
  accessToken: string,
  signal?: AbortSignal
): Promise<MoodEntry[]> {
  const url = `${BASE_URL}/${spreadsheetId}/values/${RANGE}`
  const res = await fetch(url, { headers: authHeaders(accessToken), signal })
  if (!res.ok) throw res
  const data = (await res.json()) as { values?: string[][] }
  if (!data.values || data.values.length <= 1) return []
  return data.values.slice(1).map(rowToMoodEntry)
}

export async function appendEntry(
  spreadsheetId: string,
  accessToken: string,
  entry: MoodEntry
): Promise<void> {
  const url = `${BASE_URL}/${spreadsheetId}/values/${RANGE}:append?valueInputOption=RAW`
  const body = JSON.stringify({ values: [moodEntryToRow(entry)] })

  async function attempt(): Promise<void> {
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body,
    })
    if (!res.ok) throw new Error(`Sheets API error: ${res.status}`)
  }

  try {
    await attempt()
  } catch {
    await new Promise((r) => setTimeout(r, 2000))
    try {
      await attempt()
    } catch {
      throw new Error('Failed to save entry. Please check your connection and try again.')
    }
  }
}

async function ensureEntriesSheet(spreadsheetId: string, accessToken: string): Promise<void> {
  const batchUrl = `${BASE_URL}/${spreadsheetId}:batchUpdate`
  await fetch(batchUrl, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }),
  })
  const headerUrl = `${BASE_URL}/${spreadsheetId}/values/${SHEET_NAME}!A1:G1:append?valueInputOption=RAW`
  await fetch(headerUrl, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ values: [HEADER] }),
  })
}

export async function initSheet(spreadsheetId: string, accessToken: string): Promise<void> {
  const metaUrl = `${BASE_URL}/${spreadsheetId}`
  const metaRes = await fetch(metaUrl, { headers: authHeaders(accessToken) })
  const meta = (await metaRes.json()) as { sheets: Array<{ properties: { title: string } }> }
  const titles = meta.sheets?.map((s) => s.properties.title) ?? []

  if (!titles.includes(SHEET_NAME)) {
    await ensureEntriesSheet(spreadsheetId, accessToken)
  }
}

export async function createSpreadsheet(
  accessToken: string
): Promise<{ id: string; title: string }> {
  const res = await fetch(`${BASE_URL}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ properties: { title: 'Mood Ledger' } }),
  })
  if (!res.ok) throw new Error(`Could not create spreadsheet (${res.status})`)
  const data = (await res.json()) as {
    spreadsheetId?: string
    properties?: { title?: string }
    error?: { message: string }
  }
  if (!data.spreadsheetId) {
    throw new Error(data.error?.message ?? 'Could not create spreadsheet')
  }
  return { id: data.spreadsheetId, title: data.properties?.title ?? 'Mood Ledger' }
}
