import { NextResponse } from 'next/server';
import { assertSameOrigin, jsonError, readJson } from '@/lib/server/api';
import { getCurrentUser } from '@/lib/auth';
import { softDeleteTransaction, updateTransaction } from '@/lib/server/mutations';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const { id } = await context.params;
    await updateTransaction(user.id, id, await readJson(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const { id } = await context.params;
    await softDeleteTransaction(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
