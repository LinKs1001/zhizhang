import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import Database from 'better-sqlite3';

process.loadEnvFile?.('.env.local');
const [, , username, newPassword] = process.argv;
if (!username || !newPassword) {
  console.error('Usage: pnpm user:reset-password <username> <new-password>');
  process.exit(1);
}
if (newPassword.length < 8 || newPassword.length > 128) {
  console.error('Password must be 8-128 characters.');
  process.exit(1);
}
const databasePath = path.resolve(process.env.DATABASE_PATH || './data/zhizhang.db');
if (!fs.existsSync(databasePath)) {
  console.error(`Database not found: ${databasePath}`);
  process.exit(1);
}
const scryptAsync = promisify(scrypt);
const salt = randomBytes(16);
const derived = (await scryptAsync(newPassword, salt, 64));
const passwordHash = `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
const database = new Database(databasePath);
const result = database.prepare('UPDATE users SET password_hash = ? WHERE lower(username) = lower(?)').run(passwordHash, username.trim());
database.close();
if (result.changes === 0) {
  console.error('User not found.');
  process.exit(2);
}
console.log(`Password reset for ${username}.`);
