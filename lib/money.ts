export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '−' : '';
  const value = Math.abs(cents) / 100;
  return `${sign}¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoneyPlain(cents: number): string {
  return (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseAmountToCents(input: string | number): number {
  const normalized = String(input).replace(/[,，\s¥￥]/g, '').replace(/[^\d.\-]/g, '');
  if (!normalized) throw new Error('请输入金额');
  if (!/^-?\d+(?:\.\d{0,4})?$/.test(normalized)) throw new Error('金额格式不正确');
  const value = Number(normalized);
  if (!Number.isFinite(value)) throw new Error('金额格式不正确');
  return Math.round(Math.abs(value) * 100);
}

export function centsToYuan(cents: number): number {
  return cents / 100;
}

export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}
