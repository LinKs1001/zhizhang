import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type ZhizhangDb = BetterSQLite3Database<typeof schema>;

type DbGlobal = typeof globalThis & {
  __zhizhangDb?: ZhizhangDb;
  __zhizhangSqlite?: Database.Database;
};

function databasePath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'zhizhang.db');
}

export function createDatabase(filename = databasePath()): { db: ZhizhangDb; sqlite: Database.Database } {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  if (filename !== ':memory:') sqlite.pragma('journal_mode = WAL');

  const db = drizzle(sqlite, { schema });
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  if (fs.existsSync(migrationsFolder)) {
    migrate(db, { migrationsFolder });
  }
  return { db, sqlite };
}

function getDefaultDatabase(): { db: ZhizhangDb; sqlite: Database.Database } {
  const globalDb = globalThis as DbGlobal;
  if (!globalDb.__zhizhangDb || !globalDb.__zhizhangSqlite) {
    const created = createDatabase();
    globalDb.__zhizhangDb = created.db;
    globalDb.__zhizhangSqlite = created.sqlite;
  }
  return { db: globalDb.__zhizhangDb, sqlite: globalDb.__zhizhangSqlite };
}

const defaultDatabase = getDefaultDatabase();

export const db = defaultDatabase.db;
export const sqlite = defaultDatabase.sqlite;
export { schema };
