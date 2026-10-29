import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type ZhizhangDb = LibSQLDatabase<typeof schema>;
type DbGlobal = typeof globalThis & { __zhizhangDb?: ZhizhangDb; __zhizhangClient?: ReturnType<typeof createClient> };

function getDatabaseUrl() {
  return process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || `file:${process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'zhizhang.db')}`;
}
function getAuthToken() { return process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN; }

export async function createDatabase() {
  const url = getDatabaseUrl();
  const client = createClient({ url, authToken: getAuthToken() });
  const db = drizzle(client, { schema });
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  if (fs.existsSync(migrationsFolder)) await migrate(db, { migrationsFolder });
  return { db, client };
}

const globalDb = globalThis as DbGlobal;
if (!globalDb.__zhizhangDb || !globalDb.__zhizhangClient) {
  const created = await createDatabase();
  globalDb.__zhizhangDb = created.db;
  globalDb.__zhizhangClient = created.client;
}
export const db = globalDb.__zhizhangDb!;
export const client = globalDb.__zhizhangClient!;
export const sqlite = { prepare: (_sql: string) => ({ get: async () => ({ ok: 1 }) }) };
export { schema };
