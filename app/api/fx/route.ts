import { NextResponse } from 'next/server';
import { assertSameOrigin, jsonError } from '@/lib/server/api';
import { getCurrentUser } from '@/lib/auth';
import { getCnyRate } from '@/lib/server/fx';
import { CURRENCIES } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    const currency = new URL(request.url).searchParams.get('currency') || 'CNY';
    if (!(currency in CURRENCIES)) throw new Error('暂不支持这个币种');
    if (currency === 'CNY') return NextResponse.json({ currency, cnyPerUnit: 1, rateDate: '', source: 'base' });
    const rate = await getCnyRate(currency);
    return NextResponse.json({ currency, ...rate });
  } catch (error) {
    return jsonError(error);
  }
}
