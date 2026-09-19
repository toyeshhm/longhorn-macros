import { openDB, type IDBPDatabase } from 'idb'
import type { LogEntry, TableName, Tables, WeightEntry } from '../db/types'

export interface OutboxItem { seq: number; table: TableName; id: string; attempts: number; failed: string | null }

// Lookup interfaces + one mapped schema, so idb's `Schema[T]['value']` reduces to `StoreValues[T]` for generic T.
interface StoreValues extends Tables {
  outbox: Omit<OutboxItem, 'seq'> // ponytail: out-of-line autoIncrement key (seq); the value never carries it
  meta: string
}
interface StoreKeys { food_log: string; custom_foods: string; weights: string; profile: string; outbox: number; meta: string }
interface StoreIndexes {
  food_log: { date: string }; custom_foods: Record<string, never>; weights: { date: string }; profile: Record<string, never>
  outbox: { id: string }; meta: Record<string, never>
}
type Schema = { [K in keyof StoreValues]: { key: StoreKeys[K]; value: StoreValues[K]; indexes: StoreIndexes[K] } }

export class LocalStore {
  private readonly listeners = new Set<() => void>()
  private constructor(private readonly db: IDBPDatabase<Schema>) {}

  static async open(dbName: string): Promise<LocalStore> {
    const db = await openDB<Schema>(dbName, 1, {
      upgrade(d) {
        d.createObjectStore('food_log', { keyPath: 'id' }).createIndex('date', 'date')
        d.createObjectStore('weights', { keyPath: 'id' }).createIndex('date', 'date')
        d.createObjectStore('custom_foods', { keyPath: 'id' })
        d.createObjectStore('profile', { keyPath: 'id' })
        d.createObjectStore('outbox', { autoIncrement: true }).createIndex('id', 'id')
        d.createObjectStore('meta')
      },
    })
    return new LocalStore(db)
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  private changed(): void {
    for (const fn of this.listeners) fn()
  }

  // Row + outbox in one transaction. Older outbox items for the id are superseded (push reads the current row).
  async put<T extends TableName>(table: T, row: StoreValues[T]): Promise<void> {
    const tx = this.db.transaction([table, 'outbox'], 'readwrite')
    const outbox = tx.objectStore('outbox')
    await tx.objectStore(table).put({ ...row, updatedAt: new Date().toISOString() })
    for (const seq of await outbox.index('id').getAllKeys(row.id)) await outbox.delete(seq)
    await outbox.add({ table, id: row.id, attempts: 0, failed: null })
    await tx.done
    this.changed()
  }

  async remove(table: TableName, id: string): Promise<void> {
    const row = await this.get(table, id)
    if (!row) throw new Error(`no ${table} row ${id}`)
    await this.put(table, { ...row, deletedAt: new Date().toISOString() })
  }

  get<T extends TableName>(table: T, id: string): Promise<StoreValues[T] | undefined> {
    return this.db.get(table, id)
  }

  async all<T extends TableName>(table: T): Promise<StoreValues[T][]> {
    // ponytail: the `| undefined` widening is only how TS accepts idb's generic value type; getAll never yields undefined.
    const rows: readonly (StoreValues[T] | undefined)[] = await this.db.getAll(table)
    return rows.filter((r): r is StoreValues[T] => r?.deletedAt === null)
  }

  async logForDate(date: string): Promise<LogEntry[]> {
    return (await this.db.getAllFromIndex('food_log', 'date', date)).filter((r) => r.deletedAt === null)
  }

  async weightForDate(date: string): Promise<WeightEntry | undefined> {
    return (await this.db.getAllFromIndex('weights', 'date', date)).find((r) => r.deletedAt === null)
  }

  async outbox(): Promise<OutboxItem[]> {
    const items: OutboxItem[] = []
    for await (const c of this.db.transaction('outbox').store) items.push({ ...c.value, seq: c.primaryKey })
    return items
  }

  async ackOutbox(seq: number): Promise<void> {
    await this.db.delete('outbox', seq)
  }

  async bumpOutbox(seq: number, failed: string | null): Promise<void> {
    const tx = this.db.transaction('outbox', 'readwrite')
    const item = await tx.store.get(seq)
    // Absent when a newer put superseded the item mid-push; nothing to bump.
    if (item) await tx.store.put({ ...item, attempts: item.attempts + 1, failed }, seq)
    await tx.done
  }

  // Last-write-wins on updatedAt; rows with a pending local change are skipped (local wins until pushed).
  async applyRemote<T extends TableName>(table: T, rows: readonly StoreValues[T][]): Promise<void> {
    const tx = this.db.transaction([table, 'outbox'], 'readwrite')
    const store = tx.objectStore(table)
    const pending = tx.objectStore('outbox').index('id')
    for (const row of rows) {
      if (await pending.count(row.id)) continue
      const local = await store.get(row.id)
      if (!local || local.updatedAt < row.updatedAt) await store.put(row)
    }
    await tx.done
    this.changed()
  }

  getMeta(key: string): Promise<string | undefined> {
    return this.db.get('meta', key)
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.db.put('meta', value, key)
  }
}
