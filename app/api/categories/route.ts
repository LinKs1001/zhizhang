import { NextResponse } from 'next/server';
import { assertSameOrigin, jsonError, readJson } from '@/lib/server/api';
import { getCurrentUser } from '@/lib/auth';
import { addCategory } from '@/lib/server/mutations';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const input = await readJson<{ name: string; type: 'expense' | 'income'; emoji?: string; color?: string }>(request);
    const result = await addCategory(user.id, input);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
