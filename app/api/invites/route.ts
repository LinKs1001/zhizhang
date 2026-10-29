import { NextResponse } from 'next/server';
import { assertSameOrigin, jsonError } from '@/lib/server/api';
import { getCurrentUser } from '@/lib/auth';
import { getHouseholdContext, createInvite } from '@/lib/server/household';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const context = await getHouseholdContext(user.id);
    const result = await createInvite(context.householdId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
