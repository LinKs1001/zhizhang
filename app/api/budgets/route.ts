import { NextResponse } from 'next/server';
import { assertSameOrigin, jsonError, readJson } from '@/lib/server/api';
import { getCurrentUser } from '@/lib/auth';
import { saveBudgets } from '@/lib/server/mutations';

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    await saveBudgets(user.id, await readJson(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
