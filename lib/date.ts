export const APP_TIMEZONE = 'Asia/Shanghai';

function partsFor(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function todayInAppTZ(now = new Date()): string {
  const parts = partsFor(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function currentMonthKey(now = new Date()): string {
  return todayInAppTZ(now).slice(0, 7);
}

export function monthKeyFromDate(date: string): string {
  assertDateString(date);
  return date.slice(0, 7);
}

export function monthRange(month: string): { start: string; end: string } {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('月份格式应为 YYYY-MM');
  const [year, rawMonth] = month.split('-').map(Number);
  if (rawMonth < 1 || rawMonth > 12) throw new Error('月份无效');
  const start = `${year}-${String(rawMonth).padStart(2, '0')}-01`;
  const nextYear = rawMonth === 12 ? year + 1 : year;
  const nextMonth = rawMonth === 12 ? 1 : rawMonth + 1;
  const next = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const endDate = new Date(`${next}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  return { start, end: endDate.toISOString().slice(0, 10) };
}

export function addMonths(month: string, delta: number): string {
  const [year, rawMonth] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, rawMonth - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function lastMonths(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addMonths(month, index - count + 1));
}

export function daysInMonth(month: string): number {
  const { end } = monthRange(month);
  return Number(end.slice(8, 10));
}

export function formatDateZh(date: string): string {
  assertDateString(date);
  const [, month, day] = date.split('-').map(Number);
  return `${month}月${day}日`;
}

export function formatMonthZh(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, rawMonth] = month.split('-').map(Number);
  return `${year}年${rawMonth}月`;
}

export function formatWeekdayZh(date: string): string {
  assertDateString(date);
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[new Date(`${date}T12:00:00+08:00`).getDay()];
}

export function parseRelativeDate(text: string, today = todayInAppTZ()): string | null {
  if (text.includes('昨天')) return shiftDate(today, -1);
  if (text.includes('前天')) return shiftDate(today, -2);
  if (text.includes('今天') || text.includes('刚刚')) return today;
  const explicit = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})[日号]?/);
  if (explicit) {
    const year = explicit[1] ? Number(explicit[1]) : Number(today.slice(0, 4));
    const month = String(Number(explicit[2])).padStart(2, '0');
    const day = String(Number(explicit[3])).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00+08:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

export function assertDateString(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期格式应为 YYYY-MM-DD');
}
