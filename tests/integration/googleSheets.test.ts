import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readEntries, appendEntry, initSheet, createSpreadsheet } from '../../src/services/googleSheets'
import type { MoodEntry } from '../../src/models/moodEntry'

const SPREADSHEET_ID = 'test-spreadsheet-id'
const ACCESS_TOKEN = 'test-access-token'

const HEADER_ROW = ['id', 'date', 'level1', 'level2', 'level3', 'note', 'createdAt']
const DATA_ROW: string[] = [
  'uuid-1',
  '2026-05-24',
  'Happy',
  'Content',
  'Joyful',
  'Great day',
  '2026-05-24T10:00:00.000Z',
]
const MINIMAL_ROW: string[] = [
  'uuid-2',
  '2026-05-23',
  'Fearful',
  '',
  '',
  '',
  '2026-05-23T10:00:00.000Z',
]

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('readEntries', () => {
  it('skips the header row and maps rows to MoodEntry objects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ values: [HEADER_ROW, DATA_ROW] }),
    }))

    const entries = await readEntries(SPREADSHEET_ID, ACCESS_TOKEN)

    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('uuid-1')
    expect(entries[0].level1).toBe('Happy')
    expect(entries[0].level2).toBe('Content')
    expect(entries[0].level3).toBe('Joyful')
    expect(entries[0].note).toBe('Great day')
    expect(entries[0].date).toBe('2026-05-24')
    expect(entries[0].createdAt).toBe('2026-05-24T10:00:00.000Z')
  })

  it('coerces empty strings to null for optional fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ values: [HEADER_ROW, MINIMAL_ROW] }),
    }))

    const entries = await readEntries(SPREADSHEET_ID, ACCESS_TOKEN)

    expect(entries[0].level2).toBeNull()
    expect(entries[0].level3).toBeNull()
    expect(entries[0].note).toBeNull()
  })

  it('returns an empty array when values is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }))

    const entries = await readEntries(SPREADSHEET_ID, ACCESS_TOKEN)
    expect(entries).toEqual([])
  })

  it('returns an empty array when only the header row is present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ values: [HEADER_ROW] }),
    }))

    const entries = await readEntries(SPREADSHEET_ID, ACCESS_TOKEN)
    expect(entries).toEqual([])
  })

  it('calls fetch with the correct URL and Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    await readEntries(SPREADSHEET_ID, ACCESS_TOKEN)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(SPREADSHEET_ID),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        }),
      })
    )
  })

  it('forwards the AbortSignal to fetch when provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    const controller = new AbortController()
    await readEntries(SPREADSHEET_ID, ACCESS_TOKEN, controller.signal)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal })
    )
  })
})

describe('appendEntry', () => {
  const entry: MoodEntry = {
    id: 'uuid-1',
    date: '2026-05-24',
    level1: 'Happy',
    level2: 'Content',
    level3: 'Joyful',
    note: 'Great day',
    createdAt: '2026-05-24T10:00:00.000Z',
  }

  it('calls fetch with correct URL, Authorization header, and 7-element row payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedRange: 'Entries!A2:G2' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await appendEntry(SPREADSHEET_ID, ACCESS_TOKEN, entry)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('append'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining(entry.id),
      })
    )

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.values[0]).toHaveLength(7)
    expect(body.values[0]).toEqual([
      entry.id, entry.date, entry.level1, entry.level2, entry.level3, entry.note, entry.createdAt,
    ])
  })

  it('maps null optional fields to empty strings in the row', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', mockFetch)

    const minimalEntry: MoodEntry = {
      id: 'uuid-2', date: '2026-05-24', level1: 'Bad',
      level2: null, level3: null, note: null,
      createdAt: '2026-05-24T10:00:00.000Z',
    }
    await appendEntry(SPREADSHEET_ID, ACCESS_TOKEN, minimalEntry)

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.values[0][3]).toBe('')
    expect(body.values[0][4]).toBe('')
    expect(body.values[0][5]).toBe('')
  })

  it('retries once on network error and throws on second failure', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('fetch', mockFetch)

    let caughtError: Error | undefined
    const settled = appendEntry(SPREADSHEET_ID, ACCESS_TOKEN, entry).catch((e: Error) => {
      caughtError = e
    })
    await vi.runAllTimersAsync()
    await settled

    expect(caughtError).toBeDefined()
    expect(caughtError?.message).toMatch(/failed to save/i)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('initSheet', () => {
  it('creates the Entries sheet when it does not exist', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sheets: [{ properties: { title: 'Sheet1' } }] }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({}) })

    vi.stubGlobal('fetch', mockFetch)

    await initSheet(SPREADSHEET_ID, ACCESS_TOKEN)

    expect(mockFetch).toHaveBeenCalledTimes(3)
    const batchCall = mockFetch.mock.calls[1]
    expect(batchCall[0]).toContain('batchUpdate')
  })

  it('skips creation when Entries sheet already exists', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sheets: [{ properties: { title: 'Entries' } }] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await initSheet(SPREADSHEET_ID, ACCESS_TOKEN)

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('createSpreadsheet', () => {
  it('POSTs to the Sheets API and returns id and title', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        spreadsheetId: 'new-sheet-id',
        properties: { title: 'Mood Ledger' },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const ref = await createSpreadsheet(ACCESS_TOKEN)

    expect(ref.id).toBe('new-sheet-id')
    expect(ref.title).toBe('Mood Ledger')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('spreadsheets'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        }),
      })
    )
  })

  it('throws when the API response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    }))

    await expect(createSpreadsheet(ACCESS_TOKEN)).rejects.toThrow(/403/)
  })

  it('throws when spreadsheetId is absent in the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { message: 'Quota exceeded' } }),
    }))

    await expect(createSpreadsheet(ACCESS_TOKEN)).rejects.toThrow(/Quota exceeded/)
  })
})
