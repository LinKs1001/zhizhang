import { z } from 'zod';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/constants';
import { parseRelativeDate, todayInAppTZ } from '@/lib/date';
import { parseAmountToCents } from '@/lib/money';

export type CategoryOption = { id: string; name: string; type: 'expense' | 'income'; emoji: string };
export type ParsedDraft = {
  type: 'expense' | 'income';
  amountText: string;
  currency: string;
  occurredOn: string;
  categoryId: string | null;
  categoryName: string | null;
  paymentMethod: PaymentMethod;
  scope: 'joint' | 'personal';
  note: string;
  confidence: number;
  warnings: string[];
};

const modelSchema = z.object({
  type: z.enum(['expense', 'income']).default('expense'),
  amount: z.union([z.number(), z.string()]),
  currency: z.string().default('CNY'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryName: z.string().nullable().optional(),
  paymentMethod: z.enum(['wechat', 'alipay', 'bank', 'cash', 'other']).default('other'),
  scope: z.enum(['joint', 'personal']).default('joint'),
  note: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0.8),
  warnings: z.array(z.string()).default([]),
});

const paymentKeywords: Array<[string, PaymentMethod]> = [
  ['微信', 'wechat'], ['支付宝', 'alipay'], ['银行卡', 'bank'], ['刷卡', 'bank'], ['现金', 'cash'],
];
const categoryKeywords: Record<string, string[]> = {
  餐饮: ['吃', '早餐', '午餐', '晚餐', '外卖', '咖啡', '奶茶', '饭店', '餐厅', '火锅'],
  买菜: ['买菜', '盒马', '超市', '菜市场', '生鲜', '水果'],
  日用: ['日用', '纸巾', '洗发', '洗衣', '牙膏', '清洁'],
  交通: ['地铁', '公交', '打车', '滴滴', '高铁', '火车', '加油'],
  住房: ['房租', '物业', '住房'],
  水电: ['水费', '电费', '燃气', '水电'],
  通讯: ['话费', '流量', '宽带', '通讯'],
  娱乐: ['电影', '游戏', '演出', 'KTV', '娱乐'],
  医疗: ['医院', '药', '看病', '医疗'],
  教育: ['课程', '书', '培训', '学费', '教育'],
  人情: ['红包', '礼物', '份子', '人情'],
  工资: ['工资', '薪水', '发薪'],
  奖金: ['奖金', '年终奖', '绩效'],
  理财: ['利息', '基金', '分红', '理财'],
  兼职: ['兼职', '稿费', '副业'],
};
const currencyKeywords: Array<[RegExp, string]> = [
  [/\bUSD\b|美元|\$/i, 'USD'], [/\bEUR\b|欧元|€/i, 'EUR'], [/\bJPY\b|日元|円/i, 'JPY'],
  [/\bGBP\b|英镑|£/i, 'GBP'], [/HK\$|港币|港元/i, 'HKD'], [/\bAUD\b|澳元/i, 'AUD'],
  [/\bCAD\b|加元/i, 'CAD'], [/\bSGD\b|新加坡元/i, 'SGD'],
];

export function localParse(text: string, categories: CategoryOption[], today = todayInAppTZ()): ParsedDraft {
  const normalized = text.trim();
  const amountMatch = normalized.replace(/,/g, '').match(/(?:¥|￥|\$|€|£)?\s*(\d+(?:\.\d{1,4})?)/);
  if (!amountMatch) throw new Error('没有识别到金额，请换个说法或手动录入');
  const amountText = amountMatch[1];
  parseAmountToCents(amountText);
  const currency = currencyKeywords.find(([regex]) => regex.test(normalized))?.[1] ?? 'CNY';
  const type = /工资|收入|到账|奖金|报销|退款|利息|分红|收到/.test(normalized) ? 'income' : 'expense';
  const category = categories.find((item) => item.type === type && (normalized.includes(item.name) || (categoryKeywords[item.name] ?? []).some((keyword) => normalized.includes(keyword))));
  const payment = paymentKeywords.find(([keyword]) => normalized.includes(keyword))?.[1] ?? 'other';
  const occurredOn = parseRelativeDate(normalized, today) ?? today;
  const scope = normalized.includes('个人') || normalized.includes('自己') ? 'personal' : 'joint';
  return {
    type,
    amountText,
    currency,
    occurredOn,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    paymentMethod: payment,
    scope,
    note: normalized.slice(0, 200),
    confidence: category ? 0.78 : 0.55,
    warnings: category ? [] : ['没有匹配到合适分类，请确认'],
  };
}

export async function smartParse(text: string, categories: CategoryOption[], today = todayInAppTZ()): Promise<ParsedDraft> {
  const key = (process.env.DASHSCOPE_API_KEY || process.env.DEEPSEEK_API_KEY);
  if (!key) return localParse(text, categories, today);
  const categoryList = categories.map((category) => `${category.name}(${category.type === 'expense' ? '支出' : '收入'})`).join('、');
  const prompt = `你是家庭记账解析器。只输出 JSON，不要解释。当前日期：${today}。分类必须从以下列表中选择：${categoryList}。
字段：type 为 expense 或 income；amount 为正数；currency 为 CNY/USD/EUR/JPY/GBP/HKD/AUD/CAD/SGD；occurredOn 为 YYYY-MM-DD；categoryName 必须匹配分类列表；paymentMethod 为 wechat/alipay/bank/cash/other；scope 为 joint/personal；note 为简短备注；confidence 为 0-1；warnings 为字符串数组。
用户输入：${text}`;
  try {
    const response = await fetch(`${(process.env.DASHSCOPE_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DASHSCOPE_TEXT_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v3-1-250821',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('解析服务暂时不可用');
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('解析服务没有返回结果');
    const parsed = modelSchema.parse(JSON.parse(content));
    const category = categories.find((item) => item.type === parsed.type && item.name === parsed.categoryName) ?? null;
    return {
      type: parsed.type,
      amountText: String(parsed.amount),
      currency: parsed.currency,
      occurredOn: parsed.occurredOn ?? parseRelativeDate(text, today) ?? today,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      paymentMethod: parsed.paymentMethod,
      scope: parsed.scope,
      note: parsed.note || text.slice(0, 200),
      confidence: parsed.confidence,
      warnings: category ? parsed.warnings : [...parsed.warnings, '分类需要你确认'],
    };
  } catch {
    return localParse(text, categories, today);
  }
}

export function paymentLabel(value: PaymentMethod): string {
  return PAYMENT_METHODS[value];
}


