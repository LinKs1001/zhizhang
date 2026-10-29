import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await client.execute('select 1');
    return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
  } catch (error) {
    console.error('[health] database check failed', error);
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
