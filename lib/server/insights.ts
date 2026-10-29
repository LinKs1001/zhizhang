import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { formatMonthZh } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { getAnalysisData, getAskContext, getReport } from '@/lib/server/queries';
import { sha256 } from '@/lib/server/credentials';

function deterministicSummary(data: Awaited<ReturnType<typeof getAnalysisData>>): string {
  if (data.transactionCount === 0) return '这个月还没有账目，先记下第一笔，月底就能看到清晰的收支脉络。';
  const top = data.categoryBreakdown[0];
  const budgetText = data.totalBudgetCents > 0
    ? data.expenseCents <= data.totalBudgetCents
      ? `目前预算还剩 ${formatMoney(data.totalBudgetCents - data.expenseCents)}。`
      : `目前预算已超出 ${formatMoney(data.expenseCents - data.totalBudgetCents)}。`
    : '还没有设置本月预算。';
  return `本月共记录 ${data.transactionCount} 笔，收入 ${formatMoney(data.incomeCents)}，支出 ${formatMoney(data.expenseCents)}，结余 ${formatMoney(data.balanceCents)}。${top ? `支出最多的是「${top.name}」，共 ${formatMoney(top.amountCents)}。` : ''}${budgetText}`;
}

async function modelSummary(month: string, data: Awaited<ReturnType<typeof getAnalysisData>>): Promise<string> {
  const key = (process.env.DASHSCOPE_API_KEY || process.env.DEEPSEEK_API_KEY);
  if (!key) return deterministicSummary(data);
  const facts = {
    month,
    income: data.incomeCents / 100,
    expense: data.expenseCents / 100,
    balance: data.balanceCents / 100,
    budget: data.totalBudgetCents ? { amount: data.totalBudgetCents / 100, usedPercent: data.budgetUsedPct } : null,
    categories: data.categoryBreakdown.map((item) => ({ name: item.name, amount: item.amountCents / 100 })),
    members: data.memberContribution.map((item) => ({ name: item.name, amount: item.amountCents / 100 })),
    recentTrend: data.trend.map((item) => ({ month: item.month, expense: item.expenseCents / 100 })),
  };
  try {
    const response = await fetch(`${(process.env.DASHSCOPE_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DASHSCOPE_TEXT_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v3-1-250821',
        temperature: 0.35,
        max_tokens: 260,
        messages: [
          { role: 'system', content: '你为两个人的家庭账本写简短中文月报。只依据给定数据，不编造。语气自然、克制、具体，120字以内，不提模型或人工智能。' },
          { role: 'user', content: JSON.stringify(facts) },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('summary request failed');
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return payload.choices?.[0]?.message?.content?.trim() || deterministicSummary(data);
  } catch {
    return deterministicSummary(data);
  }
}

export async function getMonthlyNarrative(userId: string, month: string) {
  const data = await getAnalysisData(userId, month);
  const fingerprint = sha256(JSON.stringify({
    income: data.incomeCents,
    expense: data.expenseCents,
    categories: data.categoryBreakdown.map((item) => [item.name, item.amountCents]),
    members: data.memberContribution.map((item) => [item.name, item.amountCents]),
    budget: data.totalBudgetCents,
  }));
  const cached = await getReport(data.context.householdId, month);
  if (cached && cached.dataHash === fingerprint && Date.now() - cached.generatedAt < 86_400_000) return cached.content;
  const content = data.transactionCount === 0 ? deterministicSummary(data) : await modelSummary(month, data);
  if (cached) {
    await db.update(reports).set({ content, dataHash: fingerprint, generatedAt: Date.now() }).where(eq(reports.id, cached.id));
  } else {
    await db.insert(reports).values({
      id: randomUUID(),
      householdId: data.context.householdId,
      month,
      content,
      dataHash: fingerprint,
      generatedAt: Date.now(),
    });
  }
  return content;
}

function localAnswer(question: string, context: Awaited<ReturnType<typeof getAskContext>>): string {
  const monthLabel = formatMonthZh(context.month);
  const matchingCategory = context.thisMonth.categories.find((item) => question.includes(item.name));
  if (matchingCategory) {
    const total = context.thisMonth.categories.reduce((sum, item) => sum + item.amount, 0);
    const percent = total > 0 ? Math.round((matchingCategory.amount / total) * 100) : 0;
    return `${monthLabel}「${matchingCategory.name}」支出 ¥${matchingCategory.amount.toFixed(2)}，占本月支出的 ${percent}%。`;
  }
  if (question.includes('收入')) return `${monthLabel}家庭收入为 ¥${context.thisMonth.income.toFixed(2)}。`;
  if (question.includes('预算')) {
    return context.thisMonth.budget
      ? `${monthLabel}预算为 ¥${context.thisMonth.budget.amount.toFixed(2)}，已使用 ${context.thisMonth.budget.usedPercent ?? 0}%。`
      : `${monthLabel}还没有设置预算，可以在设置页添加。`;
  }
  return `${monthLabel}家庭支出 ¥${context.thisMonth.expense.toFixed(2)}，收入 ¥${context.thisMonth.income.toFixed(2)}，结余 ¥${context.thisMonth.balance.toFixed(2)}。你可以继续问我某个分类或成员的花费。`;
}

export async function answerQuestion(userId: string, question: string): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed || trimmed.length > 200) throw new Error('请输入 1–200 个字的问题');
  const context = await getAskContext(userId);
  const key = (process.env.DASHSCOPE_API_KEY || process.env.DEEPSEEK_API_KEY);
  if (!key) return localAnswer(trimmed, context);
  try {
    const response = await fetch(`${(process.env.DASHSCOPE_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DASHSCOPE_TEXT_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v3-1-250821',
        temperature: 0.2,
        max_tokens: 360,
        messages: [
          { role: 'system', content: '你是家庭账本的数据问答助手。只能根据提供的数据回答，不编造。金额均为人民币。回答简洁、直接，必要时给出期间和计算依据。不要提模型或人工智能。' },
          { role: 'user', content: `问题：${trimmed}\n账本数据：${JSON.stringify(context)}` },
        ],
      }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) throw new Error('question request failed');
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return payload.choices?.[0]?.message?.content?.trim() || localAnswer(trimmed, context);
  } catch {
    return localAnswer(trimmed, context);
  }
}



