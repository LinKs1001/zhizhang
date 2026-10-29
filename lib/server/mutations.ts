import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { budgets, categories, transactions } from '@/lib/db/schema';
import { CURRENCIES, type AppCurrency } from '@/lib/constants';
import { todayInAppTZ } from '@/lib/date';
import { parseAmountToCents, yuanToCents } from '@/lib/money';
import { getCnyRate } from '@/lib/server/fx';
import { broadcastHouseholdUpdate } from '@/lib/server/events';
import { getHouseholdContext } from '@/lib/server/household';

export const transactionInputSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.union([z.string(), z.number()]),
  currency: z.enum(Object.keys(CURRENCIES) as [AppCurrency, ...AppCurrency[]]).default('CNY'),
  categoryId: z.string().min(1),
  memberId: z.string().min(1),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).default(''),
  paymentMethod: z.enum(['wechat', 'alipay', 'bank', 'cash', 'other']).default('other'),
  scope: z.enum(['joint', 'personal']).default('joint'),
  visibility: z.enum(['shared', 'private']).default('shared'),
  source: z.enum(['manual', 'text', 'voice']).default('manual'),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export async function addTransaction(userId: string, rawInput: unknown) {
  const input = transactionInputSchema.parse(rawInput);
  const context = await getHouseholdContext(userId);
  if (!context.members.some((member) => member.id === input.memberId)) throw new Error('记账成员无效');
  const categoryRows = await db.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.householdId, context.householdId), eq(categories.isArchived, false))).limit(1);
  const category = categoryRows[0];
  if (!category || category.type !== input.type) throw new Error('请选择与收支类型匹配的分类');
  const originalAmountCents = parseAmountToCents(input.amount);
  if (originalAmountCents <= 0) throw new Error('金额必须大于 0');
  const originalAmount = originalAmountCents / 100;
  const rate = await getCnyRate(input.currency);
  const amountCents = input.currency === 'CNY' ? originalAmountCents : yuanToCents(originalAmount * rate.cnyPerUnit);
  if (amountCents <= 0) throw new Error('金额必须大于 0');
  const now = Date.now();
  const id = randomUUID();
  await db.insert(transactions).values({
    id,
    householdId: context.householdId,
    createdByUserId: userId,
    memberUserId: input.memberId,
    categoryId: input.categoryId,
    type: input.type,
    amountCents,
    currency: input.currency,
    originalAmount,
    exchangeRate: rate.cnyPerUnit,
    rateDate: rate.rateDate,
    occurredOn: input.occurredOn,
    note: input.note.trim(),
    paymentMethod: input.paymentMethod,
    scope: input.scope,
    visibility: input.visibility,
    source: input.source,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  broadcastHouseholdUpdate(context.householdId);
  return { id, amountCents, rate };
}

export async function updateTransaction(userId: string, id: string, rawInput: unknown) {
  const input = transactionInputSchema.parse(rawInput);
  const context = await getHouseholdContext(userId);
  const existingRows = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, context.householdId), isNull(transactions.deletedAt))).limit(1);
  const existing = existingRows[0];
  if (!existing) throw new Error('账目不存在');
  if (existing.visibility === 'private' && existing.createdByUserId !== userId) throw new Error('无权修改这笔隐私消费');
  if (!context.members.some((member) => member.id === input.memberId)) throw new Error('记账成员无效');
  const categoryRows = await db.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.householdId, context.householdId))).limit(1);
  const category = categoryRows[0];
  if (!category || category.type !== input.type) throw new Error('请选择与收支类型匹配的分类');
  const originalAmountCents = parseAmountToCents(input.amount);
  if (originalAmountCents <= 0) throw new Error('金额必须大于 0');
  const originalAmount = originalAmountCents / 100;
  const rate = await getCnyRate(input.currency);
  const amountCents = input.currency === 'CNY' ? originalAmountCents : yuanToCents(originalAmount * rate.cnyPerUnit);
  await db.update(transactions).set({
    memberUserId: input.memberId,
    categoryId: input.categoryId,
    type: input.type,
    amountCents,
    currency: input.currency,
    originalAmount,
    exchangeRate: rate.cnyPerUnit,
    rateDate: rate.rateDate,
    occurredOn: input.occurredOn,
    note: input.note.trim(),
    paymentMethod: input.paymentMethod,
    scope: input.scope,
    visibility: input.visibility,
    source: input.source,
    updatedAt: Date.now(),
  }).where(eq(transactions.id, id));
  broadcastHouseholdUpdate(context.householdId);
}

export async function softDeleteTransaction(userId: string, id: string) {
  const context = await getHouseholdContext(userId);
  const rows = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, context.householdId), isNull(transactions.deletedAt))).limit(1);
  if (!rows[0]) throw new Error('账目不存在');
  if (rows[0].visibility === 'private' && rows[0].createdByUserId !== userId) throw new Error('无权删除这笔隐私消费');
  await db.update(transactions).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(transactions.id, id));
  broadcastHouseholdUpdate(context.householdId);
}

export async function addCategory(userId: string, input: { name: string; type: 'expense' | 'income'; emoji?: string; color?: string }) {
  const context = await getHouseholdContext(userId);
  const name = input.name.trim();
  if (!name || name.length > 12) throw new Error('分类名称需为 1–12 个字符');
  const existing = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.householdId, context.householdId), eq(categories.type, input.type), eq(categories.name, name))).limit(1);
  if (existing.length) throw new Error('这个分类已经存在');
  const id = randomUUID();
  await db.insert(categories).values({
    id,
    householdId: context.householdId,
    name,
    type: input.type,
    emoji: input.emoji?.slice(0, 4) || '✨',
    color: input.color || '#7fae91',
    sortOrder: 100,
    isArchived: false,
    createdAt: Date.now(),
  });
  return { id };
}

const budgetSchema = z.object({
  totalCents: z.number().int().min(0).max(100_000_000_00),
  categories: z.array(z.object({ categoryId: z.string(), amountCents: z.number().int().min(0).max(100_000_000_00) })),
});

export async function saveBudgets(userId: string, rawInput: unknown) {
  const context = await getHouseholdContext(userId);
  const input = budgetSchema.parse(rawInput);
  const categoryRows = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.householdId, context.householdId), eq(categories.type, 'expense')));
  const validIds = new Set(categoryRows.map((row) => row.id));
  if (input.categories.some((item) => !validIds.has(item.categoryId))) throw new Error('预算分类无效');
  const now = Date.now();
  
    await db.delete(budgets).where(eq(budgets.householdId, context.householdId));
    if (input.totalCents > 0) {
      await db.insert(budgets).values({ id: randomUUID(), householdId: context.householdId, scope: 'total', categoryId: null, amountCents: input.totalCents, updatedAt: now });
    }
    for (const item of input.categories.filter((entry) => entry.amountCents > 0)) {
      await db.insert(budgets).values({ id: randomUUID(), householdId: context.householdId, scope: 'category', categoryId: item.categoryId, amountCents: item.amountCents, updatedAt: now });
    }
  broadcastHouseholdUpdate(context.householdId, 'budgets_changed');
}
