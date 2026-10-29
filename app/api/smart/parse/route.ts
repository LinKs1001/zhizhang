import { NextResponse } from 'next/server';
import { assertSameOrigin, clientIp, jsonError, rateLimit, readJson } from '@/lib/server/api';
import { getCurrentUser } from '@/lib/auth';
import { getCategories } from '@/lib/server/queries';
import { getHouseholdContext } from '@/lib/server/household';
import { smartParse } from '@/lib/server/parser';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    rateLimit(`parse:${user.id}:${clientIp(request)}`, 30, 60_000);
    const { text } = await readJson<{ text: string }>(request);
    if (!text || text.trim().length > 300) throw new Error('请输入 1–300 个字的描述');
    const context = await getHouseholdContext(user.id);
    const categoryRows = await getCategories(context.householdId);
    const draft = await smartParse(text, categoryRows.map((item) => ({ id: item.id, name: item.name, type: item.type, emoji: item.emoji })));
    return NextResponse.json(draft);
  } catch (error) {
    return jsonError(error);
  }
}
