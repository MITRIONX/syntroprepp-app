import { api, isServerReachable } from './api'
import { dbGetAll, dbRun, dbGetFirst } from './db'
import { SyncStatus } from '../types'

const SYNC_TABLES = ['lagerorte', 'kategorien', 'kisten', 'produkte', 'waren'] as const
let syncStatus: SyncStatus = 'offline'
let statusListeners: Array<(s: SyncStatus) => void> = []

export function getSyncStatus(): SyncStatus { return syncStatus }
export function onSyncStatusChange(listener: (s: SyncStatus) => void) {
  statusListeners.push(listener)
  return () => { statusListeners = statusListeners.filter(l => l !== listener) }
}
function setSyncStatus(s: SyncStatus) { syncStatus = s; statusListeners.forEach(l => l(s)) }

async function getLastSyncTime(): Promise<string> {
  const row = await dbGetFirst<{ value: string }>('SELECT value FROM sync_meta WHERE key = ?', ['last_sync'])
  return row?.value || '1970-01-01T00:00:00Z'
}

async function setLastSyncTime(time: string) {
  await dbRun('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)', ['last_sync', time])
}

export async function syncNow(): Promise<void> {
  const reachable = await isServerReachable()
  if (!reachable) { setSyncStatus('offline'); return }
  setSyncStatus('pending')
  try {
    const lastSync = await getLastSyncTime()
    const localChanges: Record<string, unknown[]> = {}
    for (const table of SYNC_TABLES) {
      const rows = await dbGetAll(`SELECT * FROM ${table} WHERE updated_at > ?`, [lastSync])
      if (rows.length > 0) localChanges[table] = rows
    }
    if (Object.keys(localChanges).length > 0) await api.sync.push(localChanges)
    const pullResult = await api.sync.pull(lastSync)
    for (const table of SYNC_TABLES) {
      const records = pullResult.changes[table] as Array<Record<string, unknown>> | undefined
      if (!records || records.length === 0) continue
      for (const record of records) {
        const existing = await dbGetFirst<{ updated_at: string }>(`SELECT updated_at FROM ${table} WHERE id = ?`, [record.id])
        if (!existing) {
          const keys = Object.keys(record)
          const placeholders = keys.map(() => '?').join(', ')
          const values = keys.map(k => { const v = record[k]; if (typeof v === 'object' && v !== null) return JSON.stringify(v); if (typeof v === 'boolean') return v ? 1 : 0; return v })
          await dbRun(`INSERT OR IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values)
        } else {
          const remoteTime = new Date(record.updated_at as string).getTime()
          const localTime = new Date(existing.updated_at).getTime()
          if (remoteTime > localTime) {
            const keys = Object.keys(record).filter(k => k !== 'id')
            const sets = keys.map(k => `${k} = ?`).join(', ')
            const values = keys.map(k => { const v = record[k]; if (typeof v === 'object' && v !== null) return JSON.stringify(v); if (typeof v === 'boolean') return v ? 1 : 0; return v })
            values.push(record.id)
            await dbRun(`UPDATE ${table} SET ${sets} WHERE id = ?`, values)
          }
        }
      }
    }
    await setLastSyncTime(pullResult.server_time)
    setSyncStatus('synced')
  } catch (err) { console.error('[SyntroPrepp] Sync failed:', err); setSyncStatus('offline') }
}

let syncInterval: ReturnType<typeof setInterval> | null = null
export function startSyncLoop(intervalMs = 30000) { if (syncInterval) return; syncNow(); syncInterval = setInterval(syncNow, intervalMs) }
export function stopSyncLoop() { if (syncInterval) { clearInterval(syncInterval); syncInterval = null } }
