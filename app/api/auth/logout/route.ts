import { NextResponse } from 'next/server';
import { assertSameOrigin, jsonError } from '@/lib/server/api';
import { deleteCurrentSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await deleteCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
