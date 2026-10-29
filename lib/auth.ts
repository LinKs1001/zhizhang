import { randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { sha256 } from '@/lib/server/credentials';

export const SESSION_COOKIE = 'zhizhang_session';
const SESSION_DAYS = 30;

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: sha256(token),
    expiresAt: expiresAt.getTime(),
    createdAt: Date.now(),
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function deleteCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  await clearSessionCookie();
}

export type SessionUser = { id: string; username: string; displayName: string };

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, Date.now())))
    .limit(1);
  return rows[0] ?? null;
}
