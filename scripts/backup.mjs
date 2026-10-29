import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

process.loadEnvFile?.('.env.local');
const source = path.resolve(process.env.DATABASE_PATH || './data/zhizhang.db');
const backupDir = path.resolve(process.env.BACKUP_DIR || './backups');
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 14);

export async function backupDatabase() {
  if (!fs.existsSync(source)) throw new Error(`Database not found: ${source}`);
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
  const target = path.join(backupDir, `zhizhang_${stamp}.db`);
  const database = new Database(source, { readonly: true });
  try {
    await database.backup(target);
  } finally {
    database.close();
  }
  const cutoff = Date.now() - retentionDays * 86400_000;
  for (const name of fs.readdirSync(backupDir)) {
    if (!/^zhizhang_.*\.db$/.test(name)) continue;
    const file = path.join(backupDir, name);
    if (path.dirname(path.resolve(file)) !== backupDir) continue;
    const stat = fs.statSync(file);
    if (stat.isFile() && stat.mtimeMs < cutoff) fs.unlinkSync(file);
  }
  console.log(`[backup] ${target}`);
  return target;
}

if (import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
  backupDatabase().catch((error) => { console.error(error); process.exit(1); });
}
