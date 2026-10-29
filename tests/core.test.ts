import { describe, expect, it } from 'vitest';
import { addMonths, formatDateZh, monthRange, parseRelativeDate } from '@/lib/date';
import { formatMoney, parseAmountToCents } from '@/lib/money';
import { localParse } from '@/lib/server/parser';

describe('money', () => {
  it('formats cents as RMB', () => expect(formatMoney(1217150)).toBe('¥12,171.50'));
  it('parses RMB input', () => expect(parseAmountToCents('¥1,208.50')).toBe(120850));
});

describe('dates', () => {
  it('calculates month boundaries', () => expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' }));
  it('handles month arithmetic', () => expect(addMonths('2026-01', -1)).toBe('2025-12'));
  it('parses relative dates', () => expect(parseRelativeDate('昨天买菜 35 元', '2026-10-28')).toBe('2026-10-27'));
  it('formats Chinese dates', () => expect(formatDateZh('2026-10-28')).toBe('10月28日'));
});

describe('local parser', () => {
  const categories = [
    { id: 'food', name: '餐饮', type: 'expense' as const, emoji: '🍜' },
    { id: 'grocery', name: '买菜', type: 'expense' as const, emoji: '🛒' },
    { id: 'salary', name: '工资', type: 'income' as const, emoji: '💰' },
  ];
  it('extracts expense details', () => {
    const draft = localParse('昨天盒马买菜128.5，微信付的', categories, '2026-10-28');
    expect(draft).toMatchObject({ type: 'expense', amountText: '128.5', currency: 'CNY', occurredOn: '2026-10-27', categoryId: 'grocery', paymentMethod: 'wechat', scope: 'joint' });
  });
  it('extracts personal income details', () => {
    const draft = localParse('今天收到工资 18600，个人', categories, '2026-10-28');
    expect(draft).toMatchObject({ type: 'income', amountText: '18600', categoryId: 'salary', scope: 'personal' });
  });
});
