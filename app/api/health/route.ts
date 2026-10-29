import { NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    sqlite.prepare('select 1').get();
    return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
