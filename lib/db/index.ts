import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type ZhizhangDb = LibSQLDatabase<typeof schema>;
type DbGlobal = typeof globalThis & {
  __zhizhangDb?: ZhizhangDb;
  __zhizhangClient?: ReturnType<typeof createClient>;
  __zhizhangMigration?: Promise<void>;
};

function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

function getDatabaseUrl() {
  return process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || `file:${process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'zhizhang.db')}`;
}

function ensureLocalDirectory(url: string) {
  if (!url.startsWith('file:')) return;
  const filePath = url.slice('file:'.length);
  if (!filePath || filePath === ':memory:' || filePath.startsWith(':memory:')) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function runMigrations(db: ZhizhangDb) {
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  if (!fs.existsSync(migrationsFolder) || isBuildPhase()) return;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await migrate(db, { migrationsFolder });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

export async function createDatabase() {
  const url = getDatabaseUrl();
  if (process.env.NODE_ENV === 'production' && !process.env.TURSO_DATABASE_URL && !process.env.LIBSQL_URL) {
    console.warn('[db] TURSO_DATABASE_URL is not set; falling back to a local SQLite file that may not persist.');
  }
  ensureLocalDirectory(url);
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN });
  const db = drizzle(client, { schema });
  await runMigrations(db);
  return { db, client };
}

const globalDb = globalThis as DbGlobal;
if (!globalDb.__zhizhangDb || !globalDb.__zhizhangClient) {
  if (!globalDb.__zhizhangMigration) {
    globalDb.__zhizhangMigration = createDatabase().then((created) => {
      globalDb.__zhizhangDb = created.db;
      globalDb.__zhizhangClient = created.client;
    });
  }
  await globalDb.__zhizhangMigration;
}
export const db = globalDb.__zhizhangDb!;
export const client = globalDb.__zhizhangClient!;
export { schema };
