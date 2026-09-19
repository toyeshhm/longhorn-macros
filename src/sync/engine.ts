import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { fromRemote, toRemote } from '../db/codec'
import type { TableName } from '../db/types'
import { log } from '../log'
import type { LocalStore } from './store'

const TABLES: readonly TableName[] = ['food_log', 'custom_foods', 'weights', 'profile']
const EPOCH = '1970-01-01T00:00:00.000Z'

export function backoffMs(attempt: number): number {
  return Math.min(2000 * 2 ** attempt, 300_000)
}

// PostgREST rejections carry a code (23514, 42501, PGRST...); a fetch failure surfaces with an empty code.
function isNetwork(e: PostgrestError): boolean {
  return !e.code || /Failed to fetch|NetworkError/.test(e.message)
}

export class SyncEngine {
  private attempt = 0
  private started = false
  private retry: ReturnType<typeof setTimeout> | undefined
  private interval: ReturnType<typeof setInterval> | undefined
  private inflight: Promise<void> | undefined
  private triggers = 0

  constructor(private readonly store: LocalStore, private readonly client: SupabaseClient, private readonly userId: string) {}

  private readonly kick = (): void => { void this.runOnce() }

  async push(): Promise<{ pushed: number; failed: number }> {
    let pushed = 0
    let failed = 0
    for (const item of await this.store.outbox()) {
      if (item.failed !== null) continue
      const row = await this.store.get(item.table, item.id)
      if (!row) { await this.store.ackOutbox(item.seq); continue } // nothing left to send
      const rec = toRemote(item.table, row)
      // profile is keyed by the user's id; every other table carries user_id so RLS rejects a mismatched session.
      const { error } = await this.client.from(item.table).upsert(item.table === 'profile' ? rec : { ...rec, user_id: this.userId })
      if (!error) {
        await this.store.ackOutbox(item.seq)
        pushed++
      } else if (isNetwork(error)) {
        throw new Error(`sync network: ${error.message}`)
      } else {
        await this.store.bumpOutbox(item.seq, error.message)
        failed++
        log.warn('sync.rejected', { table: item.table, id: item.id, code: error.code, reason: error.message })
      }
    }
    return { pushed, failed }
  }

  async pull(): Promise<number> {
    let n = 0
    for (const table of TABLES) {
      const key = `cursor:${table}`
      const cursor = (await this.store.getMeta(key)) ?? EPOCH
      const { data, error } = await this.client.from(table).select('*').gt('updated_at', cursor).order('updated_at')
      if (error) throw new Error(`sync pull ${table}: ${error.message}`)
      const rows = data.map((r) => fromRemote(table, r))
      await this.store.applyRemote(table, rows)
      const last = rows.at(-1)
      if (last) await this.store.setMeta(key, last.updatedAt)
      n += rows.length
    }
    return n
  }

  // Overlapping triggers (online + interval + retry) share one run; a trigger that lands mid-cycle adds one more cycle,
  // since that cycle may already have read the outbox (e.g. back online while an offline cycle is still unwinding).
  runOnce(): Promise<void> {
    this.triggers++
    this.inflight ??= this.cycles().finally(() => { this.inflight = undefined })
    return this.inflight
  }

  private async cycles(): Promise<void> {
    let seen: number
    do {
      seen = this.triggers
      await this.cycle()
    } while (this.triggers !== seen)
  }

  private async cycle(): Promise<void> {
    clearTimeout(this.retry)
    try {
      const { pushed, failed } = await this.push()
      const pulled = await this.pull()
      this.attempt = 0
      log.info('sync.ok', { pushed, failed, pulled })
    } catch (e) {
      const inMs = backoffMs(this.attempt++)
      log.warn('sync.retry', { error: String(e), inMs, scheduled: this.started })
      if (this.started) this.retry = setTimeout(this.kick, inMs)
    }
  }

  start(): void {
    this.started = true
    window.addEventListener('online', this.kick)
    document.addEventListener('visibilitychange', this.kick) // ponytail: syncing on hide too is harmless (flushes before backgrounding)
    this.interval = setInterval(this.kick, 60_000)
    this.kick()
  }

  stop(): void {
    this.started = false
    window.removeEventListener('online', this.kick)
    document.removeEventListener('visibilitychange', this.kick)
    clearInterval(this.interval)
    clearTimeout(this.retry)
  }

  // True after a failed cycle until the next one succeeds (a backoff retry is pending).
  get retrying(): boolean {
    return this.attempt > 0
  }

  async pending(): Promise<{ queued: number; failed: number }> {
    const items = await this.store.outbox()
    const failed = items.filter((i) => i.failed !== null).length
    return { queued: items.length - failed, failed }
  }
}
