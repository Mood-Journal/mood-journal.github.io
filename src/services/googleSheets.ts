import { type MoodEntry, rowToMoodEntry, moodEntryToRow } from '@/models/moodEntry'

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets'
const SHEET_NAME = 'Entries'
const RANGE = `${SHEET_NAME}!A:G`
const HEADER = ['id', 'date', 'level1', 'level2', 'level3', 'note', 'createdAt']

async function findRowIndex(
  spreadsheetId: string,
  accessToken: string,
  entryId: string
): Promise<number | null> {
  const url = `${BASE_URL}/${spreadsheetId}/values/${SHEET_NAME}!A:A`
  const res = await fetch(url, { headers: authHeaders(accessToken) })
  if (!res.ok) throw res
  const data = (await res.json()) as { values?: string[][] }
  if (!data.values) return null
  const idx = data.values.findIndex((row) => row[0] === entryId)
  // idx 0 is the header; a real entry must be at idx >= 1
  return idx >= 1 ? idx + 1 : null // convert to 1-based sheet row number
}

async function getEntriesSheetId(spreadsheetId: string, accessToken: string): Promise<number> {
  const res = await fetch(`${BASE_URL}/${spreadsheetId}`, { headers: authHeaders(accessToken) })
  if (!res.ok) throw res
  const data = (await res.json()) as {
    sheets: Array<{ properties: { title: string; sheetId: number } }>
  }
  const sheet = data.sheets?.find((s) => s.properties.title === SHEET_NAME)
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found`)
  return sheet.properties.sheetId
}

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
  const init: RequestInit = {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ values: [moodEntryToRow(entry)] }),
  }

  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    // Network error — the write's server-side status is unknown; retrying risks
    // appending a duplicate row if the request reached Sheets before the failure.
    throw new Error('Failed to save entry. Please check your connection and try again.')
  }

  if (res.ok) return

  // 4xx: request was rejected; the row was not written.
  if (res.status < 500) throw new Error(`Sheets API error: ${res.status}`)

  // 5xx: server error — the write definitely did not go through; retry once.
  await new Promise<void>((r) => setTimeout(r, 2000))
  let retryRes: Response
  try {
    retryRes = await fetch(url, init)
  } catch {
    throw new Error('Failed to save entry. Please check your connection and try again.')
  }
  if (!retryRes.ok) throw new Error(`Sheets API error: ${retryRes.status}`)
}

export async function updateEntry(
  spreadsheetId: string,
  accessToken: string,
  entry: MoodEntry
): Promise<void> {
  const rowIndex = await findRowIndex(spreadsheetId, accessToken, entry.id)
  if (rowIndex === null) {
    await appendEntry(spreadsheetId, accessToken, entry)
    return
  }
  const range = `${SHEET_NAME}!A${rowIndex}:G${rowIndex}`
  const res = await fetch(
    `${BASE_URL}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ values: [moodEntryToRow(entry)] }),
    }
  )
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`)
}

export async function deleteEntry(
  spreadsheetId: string,
  accessToken: string,
  entryId: string
): Promise<void> {
  const [rowIndex, sheetId] = await Promise.all([
    findRowIndex(spreadsheetId, accessToken, entryId),
    getEntriesSheetId(spreadsheetId, accessToken),
  ])
  if (rowIndex === null) return
  const res = await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // 0-based
              endIndex: rowIndex,
            },
          },
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`)
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
    body: JSON.stringify({ properties: { title: 'Mood Journal' } }),
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
  return { id: data.spreadsheetId, title: data.properties?.title ?? 'Mood Journal' }
}
