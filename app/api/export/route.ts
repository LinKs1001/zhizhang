import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, transactions, users } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getHouseholdContext } from '@/lib/server/household';
import { PAYMENT_METHODS, TRANSACTION_SCOPES, TRANSACTION_TYPES, TRANSACTION_VISIBILITY, type PaymentMethod, type PaymentMethod as PM } from '@/lib/constants';

function csvCell(value: string | number): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const context = await getHouseholdContext(user.id);
  const rows = await db
    .select({
      occurredOn: transactions.occurredOn,
      type: transactions.type,
      amountCents: transactions.amountCents,
      currency: transactions.currency,
      originalAmount: transactions.originalAmount,
      exchangeRate: transactions.exchangeRate,
      rateDate: transactions.rateDate,
      category: categories.name,
      note: transactions.note,
      member: users.displayName,
      paymentMethod: transactions.paymentMethod,
      scope: transactions.scope,
      visibility: transactions.visibility,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .innerJoin(users, eq(users.id, transactions.memberUserId))
    .where(and(
      eq(transactions.householdId, context.householdId),
      isNull(transactions.deletedAt),
      or(eq(transactions.visibility, 'shared'), and(eq(transactions.visibility, 'private'), eq(transactions.createdByUserId, user.id))),
    ))
    .orderBy(asc(transactions.occurredOn), asc(transactions.createdAt));
  const header = ['日期', '类型', '折算人民币金额', '原币种', '原币金额', '汇率', '汇率日期', '分类', '备注', '成员', '支付方式', '归属', '可见性'];
  const lines = rows.map((row) => [
    row.occurredOn,
    TRANSACTION_TYPES[row.type],
    (row.amountCents / 100).toFixed(2),
    row.currency,
    row.originalAmount.toFixed(2),
    row.exchangeRate,
    row.rateDate,
    row.category,
    row.note,
    row.member,
    PAYMENT_METHODS[row.paymentMethod as PaymentMethod],
    TRANSACTION_SCOPES[row.scope as keyof typeof TRANSACTION_SCOPES],
    TRANSACTION_VISIBILITY[row.visibility as keyof typeof TRANSACTION_VISIBILITY],
  ].map(csvCell).join(','));
  const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`;
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="zhizhang-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
