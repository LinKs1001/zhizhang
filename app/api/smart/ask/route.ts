import { NextResponse } from 'next/server';
import { assertSameOrigin, clientIp, jsonError, rateLimit, readJson } from '@/lib/server/api';
import { getCurrentUser } from '@/lib/auth';
import { answerQuestion } from '@/lib/server/insights';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    rateLimit(`ask:${user.id}:${clientIp(request)}`, 15, 60_000);
    const { question } = await readJson<{ question: string }>(request);
    const answer = await answerQuestion(user.id, question || '');
    return NextResponse.json({ answer });
  } catch (error) {
    return jsonError(error);
  }
}
