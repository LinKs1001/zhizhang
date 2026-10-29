import { NextResponse } from 'next/server';
import { assertSameOrigin, jsonError, readJson } from '@/lib/server/api';
import { getCurrentUser } from '@/lib/auth';
import { addTransaction } from '@/lib/server/mutations';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const result = await addTransaction(user.id, await readJson(request));
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
