import type { MoodEntry } from '@/models/moodEntry'
import {
  readEntries,
  appendEntry,
  updateEntry as sheetsUpdateEntry,
  deleteEntry as sheetsDeleteEntry,
} from '@/services/googleSheets'
import { loadLocalEntries, saveLocalEntries, loadTombstones, saveTombstones } from '@/lib/storage'
import { getPendingToSync, buildMergedEntries, dedupeById } from '@/services/syncReconciler'

// Shared across every caller in the tab. inFlight tracks ids currently being
// pushed so a concurrent reconcile never appends the same entry twice; activeSync
// coalesces overlapping reconcile runs (parallel hook instances, token refreshes)
// into one network round-trip.
const inFlight = new Set<string>()
let activeSync: Promise<MoodEntry[]> | null = null

export interface MutationResult {
  entries: MoodEntry[]
  error: string | null
}

export function mapApiError(status: number, spreadsheetId: string): string {
  if (status === 401) return 'Session expired — Reconnect'
  if (status === 404)
    return `Spreadsheet not found — reconnect or create a new one (ID: ${spreadsheetId})`
  if (status === 429) return 'Storage quota exceeded — try again later'
  return `Unexpected error (${status}). Please try again.`
}

function toSyncErrorMessage(err: unknown, spreadsheetId: string): string {
  if (err instanceof Response) return mapApiError(err.status, spreadsheetId)
  if (err instanceof Error) return err.message
  return 'Saved locally. Could not sync to Drive — try again later.'
}

async function reconcile(spreadsheetId: string, accessToken: string): Promise<MoodEntry[]> {
  // Reading local state after the network round-trip minimises the window in which
  // a concurrent addEntry write could land in localStorage but be absent from the
  // snapshot used for the merge comparison.
  const sheetsEntries = dedupeById(await readEntries(spreadsheetId, accessToken))
  const localEntries = await loadLocalEntries()
  const tombstones = await loadTombstones()
  const sheetsIds = new Set(sheetsEntries.map((e) => e.id))

  const pendingToSync = getPendingToSync(localEntries, sheetsIds, inFlight)

  let pushedIds = new Set<string>()
  if (pendingToSync.length > 0) {
    const results = await Promise.allSettled(
      pendingToSync.map((e) => appendEntry(spreadsheetId, accessToken, e))
    )
    pushedIds = new Set(
      pendingToSync.filter((_, i) => results[i].status === 'fulfilled').map((e) => e.id)
    )
  }

  // Propagate local deletions: remove each tombstoned row still present in the
  // sheet, then drop the tombstone. Deleting by row index shifts the rows below
  // it, so these must run sequentially — sheetsDeleteEntry re-reads the index
  // per call. A tombstone whose row is already absent is dropped (nothing to do);
  // a failed delete is retained so the next sync retries it.
  const remainingTombstones: string[] = []
  for (const id of tombstones) {
    if (!sheetsIds.has(id)) continue
    try {
      await sheetsDeleteEntry(spreadsheetId, accessToken, id)
    } catch {
      remainingTombstones.push(id)
    }
  }
  await saveTombstones(remainingTombstones)

  // justSynced: entries just pushed — not yet in sheetsEntries (fetched before push),
  // so they must be injected explicitly, marked synced.
  // retainLocal: entries whose push failed; keep as pending for the next sync attempt.
  // Synced entries absent from Sheets are dropped — they were deleted remotely.
  const justSynced = pendingToSync
    .filter((e) => pushedIds.has(e.id))
    .map((e) => ({ ...e, syncStatus: 'synced' as const }))
  const retainLocal = localEntries.filter(
    (e) => e.syncStatus !== 'synced' && !sheetsIds.has(e.id) && !pushedIds.has(e.id)
  )

  // Strip tombstoned ids from the sheet snapshot so a row still pending remote
  // deletion (delete failed above) is not resurrected into local state.
  const tombstoneSet = new Set(tombstones)
  const survivingSheets = sheetsEntries.filter((e) => !tombstoneSet.has(e.id))
  const merged = buildMergedEntries(survivingSheets, justSynced, retainLocal)
  await saveLocalEntries(merged)
  return merged
}

// Reconcile local state with the sheet. Single-flight: concurrent callers share
// one run and receive the same merged result.
export function runSync(spreadsheetId: string, accessToken: string): Promise<MoodEntry[]> {
  if (activeSync) return activeSync
  activeSync = reconcile(spreadsheetId, accessToken).finally(() => {
    activeSync = null
  })
  return activeSync
}

export async function addEntry(
  entry: MoodEntry,
  spreadsheetId: string | null,
  accessToken: string | null
): Promise<MutationResult> {
  // Register the id before persisting so a concurrent reconcile that sees the
  // entry in localStorage also sees it in-flight and skips it.
  inFlight.add(entry.id)
  try {
    const withEntry = [entry, ...(await loadLocalEntries())]
    await saveLocalEntries(withEntry)

    if (!spreadsheetId || !accessToken) return { entries: withEntry, error: null }

    try {
      await appendEntry(spreadsheetId, accessToken, entry)
      const synced = { ...entry, syncStatus: 'synced' as const }
      const next = (await loadLocalEntries()).map((e) => (e.id === entry.id ? synced : e))
      await saveLocalEntries(next)
      return { entries: next, error: null }
    } catch (err: unknown) {
      return { entries: withEntry, error: toSyncErrorMessage(err, spreadsheetId) }
    }
  } finally {
    inFlight.delete(entry.id)
  }
}

export async function updateEntry(
  updated: MoodEntry,
  spreadsheetId: string | null,
  accessToken: string | null
): Promise<MutationResult> {
  const next = (await loadLocalEntries()).map((e) => (e.id === updated.id ? updated : e))
  await saveLocalEntries(next)

  if (!spreadsheetId || !accessToken || updated.syncStatus !== 'synced') {
    return { entries: next, error: null }
  }

  try {
    await sheetsUpdateEntry(spreadsheetId, accessToken, updated)
    return { entries: next, error: null }
  } catch (err: unknown) {
    return { entries: next, error: toSyncErrorMessage(err, spreadsheetId) }
  }
}

export async function deleteEntry(
  entryId: string,
  spreadsheetId: string | null,
  accessToken: string | null
): Promise<MutationResult> {
  const localEntries = await loadLocalEntries()
  const entry = localEntries.find((e) => e.id === entryId)
  const next = localEntries.filter((e) => e.id !== entryId)
  await saveLocalEntries(next)

  // Only synced entries exist in the sheet. Record a tombstone first so the
  // deletion survives across syncs: if the immediate remote delete below fails
  // or no token is available, the next reconcile retries it rather than
  // resurrecting the row from the sheet.
  if (entry?.syncStatus === 'synced') {
    await saveTombstones([...(await loadTombstones()), entryId])

    if (spreadsheetId && accessToken) {
      try {
        await sheetsDeleteEntry(spreadsheetId, accessToken, entryId)
        await saveTombstones((await loadTombstones()).filter((id) => id !== entryId))
      } catch {
        // Best effort — the tombstone keeps the deletion pending for next sync.
      }
    }
  }
  return { entries: next, error: null }
}
