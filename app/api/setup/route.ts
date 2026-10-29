import { NextResponse } from 'next/server';
import { assertSameOrigin, clientIp, jsonError, rateLimit, readJson } from '@/lib/server/api';
import { setupOwner } from '@/lib/server/household';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`setup:${clientIp(request)}`, 5, 60_000);
    const input = await readJson<{ setupToken: string; username: string; password: string; displayName: string; householdName?: string }>(request);
    const result = await setupOwner(input);
    const session = await createSession(result.userId);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
