import { NextResponse } from 'next/server';
import { assertSameOrigin, clientIp, jsonError, rateLimit, readJson } from '@/lib/server/api';
import { findUserByUsername } from '@/lib/server/household';
import { verifyPassword } from '@/lib/server/credentials';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readJson<{ username: string; password: string }>(request);
    const ip = clientIp(request);
    rateLimit(`login-ip:${ip}`, 20, 60_000);
    rateLimit(`login-user:${input.username?.toLowerCase()}`, 8, 60_000);
    const user = await findUserByUsername(input.username || '');
    if (!user || !(await verifyPassword(input.password || '', user.passwordHash))) {
      return NextResponse.json({ error: '用户名或密码不正确' }, { status: 401 });
    }
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
