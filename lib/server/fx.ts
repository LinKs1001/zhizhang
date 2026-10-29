import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { fxRates } from '@/lib/db/schema';
import { todayInAppTZ } from '@/lib/date';

const currencyCodes = new Set(['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'AUD', 'CAD', 'SGD']);

export async function getCnyRate(currency: string, rateDate = todayInAppTZ()): Promise<{ cnyPerUnit: number; rateDate: string; source: 'cache' | 'live' | 'base' }> {
  if (currency === 'CNY') return { cnyPerUnit: 1, rateDate, source: 'base' };
  if (!currencyCodes.has(currency)) throw new Error('暂不支持这个币种');
  const cached = await db.select().from(fxRates).where(and(eq(fxRates.currency, currency), eq(fxRates.rateDate, rateDate))).limit(1);
  if (cached[0]) return { cnyPerUnit: cached[0].cnyPerUnit, rateDate, source: 'cache' };
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/CNY', { signal: AbortSignal.timeout(7000), cache: 'no-store' });
    if (!response.ok) throw new Error('汇率服务不可用');
    const data = (await response.json()) as { rates?: Record<string, number> };
    const value = data.rates?.[currency];
    if (!value || !Number.isFinite(value) || value <= 0) throw new Error('没有找到这个币种的汇率');
    const cnyPerUnit = 1 / value;
    await db.insert(fxRates).values({ id: randomUUID(), currency, rateDate, cnyPerUnit, fetchedAt: Date.now() }).onConflictDoNothing();
    return { cnyPerUnit, rateDate, source: 'live' };
  } catch (error) {
    const latest = await db.select().from(fxRates).where(eq(fxRates.currency, currency)).orderBy(desc(fxRates.rateDate)).limit(1);
    if (latest[0]) return { cnyPerUnit: latest[0].cnyPerUnit, rateDate: latest[0].rateDate, source: 'cache' };
    throw new Error(error instanceof Error ? `汇率获取失败：${error.message}` : '汇率获取失败');
  }
}
