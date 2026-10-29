import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { budgets, categories, memberships, reports, transactions, users } from '@/lib/db/schema';
import { getHouseholdContext } from '@/lib/server/household';
import { currentMonthKey, lastMonths, monthRange } from '@/lib/date';

const baseShared = (householdId: string, start: string, end: string) =>
  and(
    eq(transactions.householdId, householdId),
    isNull(transactions.deletedAt),
    eq(transactions.visibility, 'shared'),
    gte(transactions.occurredOn, start),
    lte(transactions.occurredOn, end),
  );

export type TransactionRow = {
  id: string;
  type: 'expense' | 'income';
  amountCents: number;
  currency: string;
  originalAmount: number;
  exchangeRate: number;
  occurredOn: string;
  note: string;
  paymentMethod: string;
  scope: string;
  visibility: string;
  source: string;
  createdAt: number;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  categoryColor: string;
  memberId: string;
  memberName: string;
  createdByUserId: string;
};

export async function getCategories(householdId: string, type?: 'expense' | 'income') {
  const conditions = [eq(categories.householdId, householdId), eq(categories.isArchived, false)];
  if (type) conditions.push(eq(categories.type, type));
  return db.select().from(categories).where(and(...conditions)).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getDashboardData(userId: string, month = currentMonthKey()) {
  const context = await getHouseholdContext(userId);
  const { start, end } = monthRange(month);
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      occurredOn: transactions.occurredOn,
      note: transactions.note,
      paymentMethod: transactions.paymentMethod,
      scope: transactions.scope,
      visibility: transactions.visibility,
      memberId: transactions.memberUserId,
      memberName: users.displayName,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryEmoji: categories.emoji,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .innerJoin(users, eq(users.id, transactions.memberUserId))
    .where(baseShared(context.householdId, start, end))
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));
  const incomeCents = rows.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.amountCents, 0);
  const expenseCents = rows.filter((row) => row.type === 'expense').reduce((sum, row) => sum + row.amountCents, 0);
  const budgetRows = await db.select().from(budgets).where(eq(budgets.householdId, context.householdId));
  const totalBudgetCents = budgetRows.find((row) => row.scope === 'total')?.amountCents ?? 0;
  const expenseByCategory = new Map<string, number>();
  for (const row of rows) {
    if (row.type !== 'expense') continue;
    expenseByCategory.set(row.categoryId, (expenseByCategory.get(row.categoryId) ?? 0) + row.amountCents);
  }
  const categoryBudgets = budgetRows
    .filter((row) => row.scope === 'category' && row.categoryId)
    .map((row) => {
      const category = rows.find((item) => item.categoryId === row.categoryId);
      return {
        categoryId: row.categoryId!,
        name: category?.categoryName ?? '分类',
        emoji: category?.categoryEmoji ?? '✨',
        budgetCents: row.amountCents,
        spentCents: expenseByCategory.get(row.categoryId!) ?? 0,
      };
    });
  return {
    context,
    month,
    rows,
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    totalBudgetCents,
    budgetUsedPct: totalBudgetCents > 0 ? Math.round((expenseCents / totalBudgetCents) * 100) : null,
    categoryBudgets,
    recent: rows.slice(0, 4),
    transactionCount: rows.length,
  };
}

export async function getTransactions(userId: string, filters: { month?: string; type?: string; memberId?: string; categoryId?: string; includePrivate?: boolean }) {
  const context = await getHouseholdContext(userId);
  const month = filters.month || currentMonthKey();
  const { start, end } = monthRange(month);
  const conditions = [
    eq(transactions.householdId, context.householdId),
    isNull(transactions.deletedAt),
    gte(transactions.occurredOn, start),
    lte(transactions.occurredOn, end),
    filters.includePrivate
      ? or(eq(transactions.visibility, 'shared'), and(eq(transactions.visibility, 'private'), eq(transactions.createdByUserId, userId)))
      : eq(transactions.visibility, 'shared'),
  ];
  if (filters.type === 'expense' || filters.type === 'income') conditions.push(eq(transactions.type, filters.type));
  if (filters.memberId) conditions.push(eq(transactions.memberUserId, filters.memberId));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      currency: transactions.currency,
      originalAmount: transactions.originalAmount,
      exchangeRate: transactions.exchangeRate,
      occurredOn: transactions.occurredOn,
      note: transactions.note,
      paymentMethod: transactions.paymentMethod,
      scope: transactions.scope,
      visibility: transactions.visibility,
      source: transactions.source,
      createdAt: transactions.createdAt,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryEmoji: categories.emoji,
      categoryColor: categories.color,
      memberId: transactions.memberUserId,
      memberName: users.displayName,
      createdByUserId: transactions.createdByUserId,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .innerJoin(users, eq(users.id, transactions.memberUserId))
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));
}

export async function getTransactionById(userId: string, id: string) {
  const context = await getHouseholdContext(userId);
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.householdId, context.householdId), isNull(transactions.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.visibility === 'private' && row.createdByUserId !== userId) return null;
  return row;
}

export async function getBudgetSettings(householdId: string) {
  return db.select().from(budgets).where(eq(budgets.householdId, householdId));
}

export async function getAnalysisData(userId: string, month = currentMonthKey()) {
  const context = await getHouseholdContext(userId);
  const months = lastMonths(month, 6);
  const oldest = monthRange(months[0]).start;
  const latest = monthRange(month).end;
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      occurredOn: transactions.occurredOn,
      memberId: transactions.memberUserId,
      memberName: users.displayName,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryEmoji: categories.emoji,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .innerJoin(users, eq(users.id, transactions.memberUserId))
    .where(baseShared(context.householdId, oldest, latest));
  const currentRows = rows.filter((row) => row.occurredOn.startsWith(month));
  const incomeCents = currentRows.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.amountCents, 0);
  const expenseCents = currentRows.filter((row) => row.type === 'expense').reduce((sum, row) => sum + row.amountCents, 0);
  const trend = months.map((key) => {
    const monthRows = rows.filter((row) => row.type === 'expense' && row.occurredOn.startsWith(key));
    return { month: key, expenseCents: monthRows.reduce((sum, row) => sum + row.amountCents, 0) };
  });
  const categoryMap = new Map<string, { name: string; emoji: string; color: string; amountCents: number }>();
  for (const row of currentRows.filter((item) => item.type === 'expense')) {
    const current = categoryMap.get(row.categoryId) ?? { name: row.categoryName, emoji: row.categoryEmoji, color: row.categoryColor, amountCents: 0 };
    current.amountCents += row.amountCents;
    categoryMap.set(row.categoryId, current);
  }
  const categoryBreakdown = [...categoryMap.values()].sort((a, b) => b.amountCents - a.amountCents);
  const memberMap = new Map<string, { name: string; amountCents: number }>();
  for (const row of currentRows.filter((item) => item.type === 'expense')) {
    const current = memberMap.get(row.memberId) ?? { name: row.memberName, amountCents: 0 };
    current.amountCents += row.amountCents;
    memberMap.set(row.memberId, current);
  }
  const memberContribution = [...memberMap.values()].sort((a, b) => b.amountCents - a.amountCents);
  const dashboard = await getDashboardData(userId, month);
  return {
    context,
    month,
    months,
    rows,
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    trend,
    categoryBreakdown,
    memberContribution,
    budgetUsedPct: dashboard.budgetUsedPct,
    totalBudgetCents: dashboard.totalBudgetCents,
    transactionCount: currentRows.length,
  };
}

export async function getAskContext(userId: string) {
  const context = await getHouseholdContext(userId);
  const month = currentMonthKey();
  const months = lastMonths(month, 6);
  const data = await getAnalysisData(userId, month);
  const recent = await getTransactions(userId, { month, includePrivate: false });
  const categoryTotals = data.categoryBreakdown.slice(0, 10).map((item) => ({ name: item.name, amount: item.amountCents / 100 }));
  const members = data.context.members.map((member) => member.displayName);
  return {
    householdName: context.householdName,
    month,
    currency: '人民币',
    months,
    thisMonth: {
      income: data.incomeCents / 100,
      expense: data.expenseCents / 100,
      balance: data.balanceCents / 100,
      categories: categoryTotals,
      members,
      memberContribution: data.memberContribution.map((item) => ({ name: item.name, amount: item.amountCents / 100 })),
      budget: data.totalBudgetCents > 0 ? { amount: data.totalBudgetCents / 100, usedPercent: data.budgetUsedPct } : null,
    },
    trend: data.trend.map((item) => ({ month: item.month, expense: item.expenseCents / 100 })),
    recentTransactions: recent.slice(0, 60).map((row) => ({
      date: row.occurredOn,
      type: row.type,
      amount: row.amountCents / 100,
      category: row.categoryName,
      note: row.note,
      member: row.memberName,
      scope: row.scope,
    })),
  };
}

export async function getAllCategories(householdId: string) {
  return db.select().from(categories).where(and(eq(categories.householdId, householdId), eq(categories.isArchived, false))).orderBy(asc(categories.type), asc(categories.sortOrder));
}

export async function getCategoryById(householdId: string, id: string) {
  const rows = await db.select().from(categories).where(and(eq(categories.id, id), eq(categories.householdId, householdId))).limit(1);
  return rows[0] ?? null;
}

export async function getReport(householdId: string, month: string) {
  const rows = await db.select().from(reports).where(and(eq(reports.householdId, householdId), eq(reports.month, month))).limit(1);
  return rows[0] ?? null;
}

export async function getMemberById(householdId: string, id: string) {
  const rows = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .where(and(eq(users.id, id), eq(memberships.householdId, householdId)))
    .limit(1);
  return rows[0] ?? null;
}

