export type AppCurrency = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'GBP' | 'HKD' | 'AUD' | 'CAD' | 'SGD';

export const CURRENCIES: Record<AppCurrency, { label: string; symbol: string; country: string }> = {
  CNY: { label: '人民币', symbol: '¥', country: '中国' },
  USD: { label: '美元', symbol: '$', country: '美国' },
  EUR: { label: '欧元', symbol: '€', country: '欧元区' },
  JPY: { label: '日元', symbol: '¥', country: '日本' },
  GBP: { label: '英镑', symbol: '£', country: '英国' },
  HKD: { label: '港币', symbol: 'HK$', country: '中国香港' },
  AUD: { label: '澳元', symbol: 'A$', country: '澳大利亚' },
  CAD: { label: '加元', symbol: 'C$', country: '加拿大' },
  SGD: { label: '新加坡元', symbol: 'S$', country: '新加坡' },
};

export const PAYMENT_METHODS = {
  wechat: '微信支付',
  alipay: '支付宝',
  bank: '银行卡',
  cash: '现金',
  other: '其他',
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const TRANSACTION_TYPES = {
  expense: '支出',
  income: '收入',
} as const;

export const TRANSACTION_SCOPES = {
  joint: '共同支出',
  personal: '个人支出',
} as const;

export const TRANSACTION_VISIBILITY = {
  shared: '共同账本',
  private: '隐私消费',
} as const;

export const DEFAULT_CATEGORIES = [
  { name: '餐饮', type: 'expense', emoji: '🍜', color: '#c9856a' },
  { name: '买菜', type: 'expense', emoji: '🛒', color: '#7fae91' },
  { name: '日用', type: 'expense', emoji: '🧴', color: '#d8b062' },
  { name: '交通', type: 'expense', emoji: '🚇', color: '#8b9c94' },
  { name: '住房', type: 'expense', emoji: '🏠', color: '#a88d6b' },
  { name: '水电', type: 'expense', emoji: '💡', color: '#d1ad62' },
  { name: '通讯', type: 'expense', emoji: '📱', color: '#7fa8a0' },
  { name: '娱乐', type: 'expense', emoji: '🎬', color: '#b18a82' },
  { name: '医疗', type: 'expense', emoji: '🩺', color: '#c68f82' },
  { name: '教育', type: 'expense', emoji: '📚', color: '#94a584' },
  { name: '人情', type: 'expense', emoji: '🎁', color: '#cda46d' },
  { name: '其他', type: 'expense', emoji: '✨', color: '#a5a39e' },
  { name: '工资', type: 'income', emoji: '💰', color: '#5f927a' },
  { name: '奖金', type: 'income', emoji: '🏆', color: '#d8b062' },
  { name: '理财', type: 'income', emoji: '📈', color: '#7fae91' },
  { name: '兼职', type: 'income', emoji: '💼', color: '#9d8e7b' },
  { name: '其他', type: 'income', emoji: '✨', color: '#a5a39e' },
] as const;

export const APP_NAME = '智账';
export const MAX_HOUSEHOLD_MEMBERS = 2;
