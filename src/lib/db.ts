import * as SQLite from 'expo-sqlite'

let db: SQLite.SQLiteDatabase

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('syntroprepp.db')
    await initTables()
  }
  return db
}

async function initTables() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS lagerorte (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      created_at TEXT, updated_at TEXT, deleted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS kategorien (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      created_at TEXT, updated_at TEXT, deleted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS kisten (
      id TEXT PRIMARY KEY, nummer TEXT NOT NULL, name TEXT, lagerort_id TEXT,
      created_at TEXT, updated_at TEXT, deleted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS produkte (
      id TEXT PRIMARY KEY, ean TEXT UNIQUE, name TEXT NOT NULL, bild_url TEXT,
      kategorie_id TEXT, gewicht TEXT, naehrwerte TEXT, beschreibung TEXT,
      beipackzettel_url TEXT, quelle TEXT DEFAULT 'manuell',
      created_at TEXT, updated_at TEXT, deleted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS waren (
      id TEXT PRIMARY KEY, produkt_id TEXT, kiste_id TEXT, menge INTEGER DEFAULT 1,
      mhd_datum TEXT, mhd_geschaetzt TEXT, mhd_typ TEXT DEFAULT 'exakt',
      einlagerungsdatum TEXT, notizen TEXT,
      created_at TEXT, updated_at TEXT, device_id TEXT, deleted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS verzehr_historie (
      id TEXT PRIMARY KEY, produkt_id TEXT, produkt_name TEXT,
      menge INTEGER DEFAULT 1, verzehrt_am TEXT, kiste_nummer TEXT
    );
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY, value TEXT
    );
  `)
}

export async function dbGetAll<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const database = await getDb()
  return database.getAllAsync<T>(sql, params || [])
}

export async function dbGetFirst<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const database = await getDb()
  return database.getFirstAsync<T>(sql, params || [])
}

export async function dbRun(sql: string, params?: unknown[]) {
  const database = await getDb()
  return database.runAsync(sql, params || [])
}
