import { NextResponse } from 'next/server';
import { assertSameOrigin, clientIp, jsonError, rateLimit, readJson } from '@/lib/server/api';
import { acceptInvite } from '@/lib/server/household';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`invite:${clientIp(request)}`, 12, 60_000);
    const input = await readJson<{ code: string; username: string; password: string; displayName: string }>(request);
    const result = await acceptInvite(input);
    const session = await createSession(result.userId);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
