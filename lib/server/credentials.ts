import { createHash, randomBytes } from 'node:crypto';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string {
  const username = normalizeUsername(value);
  if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('用户名需为 3–24 位字母、数字或下划线');
  return username;
}

export function validatePassword(value: string): string {
  if (value.length < 8 || value.length > 128) throw new Error('密码长度需为 8–128 位');
  return value;
}

export function validateDisplayName(value: string): string {
  const name = value.trim();
  if (name.length < 1 || name.length > 20) throw new Error('称呼需为 1–20 个字符');
  return name;
}

export function normaliseInviteCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = stored.split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
