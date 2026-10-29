import { NextResponse } from 'next/server';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof Error && /用户名|密码|金额|日期|月份|邀请|填写|无效|格式/.test(error.message)) {
    return NextResponse.json({ error: error.message, code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: '服务器暂时开小差了，请稍后再试' }, { status: 500 });
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try {
    if (!host || new URL(origin).host !== host) throw new ApiError(403, '请求来源无效', 'FORBIDDEN');
  } catch {
    throw new ApiError(403, '请求来源无效', 'FORBIDDEN');
  }
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new ApiError(429, '操作太频繁，请稍后再试', 'RATE_LIMITED');
  current.count += 1;
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, '请求内容格式不正确');
  }
}
