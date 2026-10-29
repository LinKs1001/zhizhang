import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandIcon } from '@/components/BrandIcon';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { getCurrentUser } from '@/lib/auth';
import { currentMonthKey, formatDateZh, formatWeekdayZh, todayInAppTZ } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { getDashboardData } from '@/lib/server/queries';
import { getMonthlyNarrative } from '@/lib/server/insights';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month || '') ? params.month! : currentMonthKey();
  const data = await getDashboardData(user.id, month);
  const narrative = await getMonthlyNarrative(user.id, month);
  const today = todayInAppTZ();
  const memberInitials = data.context.members.map((member, index) => ({ ...member, tone: index === 0 ? 'dark' : 'sage' }));
  return (
    <div className="page home-page">
      <header className="home-head">
        <div>
          <div className="home-meta"><BrandIcon size={25} /><span>{formatDateZh(today)} · {formatWeekdayZh(today)}</span></div>
          <h1>家庭账本</h1>
        </div>
        <div className="avatar-stack">{memberInitials.map((member) => <span key={member.id} className={`avatar avatar-${member.tone}`} title={member.displayName}>{member.displayName.slice(0, 1)}</span>)}</div>
      </header>
      <div className="home-tools"><MonthSwitcher month={month} path="/" /><span className="quiet-note">所有金额已折算为人民币</span></div>

      <section className="balance-card">
        <div className="balance-top"><span>本月结余</span><span className="balance-dot">●</span></div>
        <strong className="balance-number">{formatMoney(data.balanceCents)}</strong>
        <div className="balance-breakdown">
          <div><span>本月收入</span><b>{formatMoney(data.incomeCents)}</b></div>
          <div><span>本月支出</span><b>{formatMoney(data.expenseCents)}</b></div>
        </div>
      </section>

      <section className="card budget-card">
        <div className="section-line"><strong>本月预算</strong>{data.totalBudgetCents > 0 ? <span>{formatMoney(data.totalBudgetCents)}</span> : <Link href="/settings">去设置 <ArrowRight size={13} /></Link>}</div>
        {data.totalBudgetCents > 0 ? (
          <>
            <div className="progress-track"><i style={{ width: `${Math.min(100, data.budgetUsedPct ?? 0)}%` }} /></div>
            <div className="progress-meta"><b>已用 {data.budgetUsedPct ?? 0}%</b><span>{data.expenseCents <= data.totalBudgetCents ? `还能花 ${formatMoney(data.totalBudgetCents - data.expenseCents)}` : `已超出 ${formatMoney(data.expenseCents - data.totalBudgetCents)}`}</span></div>
          </>
        ) : <p className="empty-copy">设置一个月度预算，花钱时更有底。</p>}
      </section>

      <section className="summary-card">
        <span className="summary-spark">✦</span>
        <div><div className="summary-title">本月小结 <em>自动更新</em></div><p>{narrative}</p></div>
      </section>

      <div className="section-head"><h2>最近账目</h2><Link href={`/transactions?month=${month}`}>全部 <ArrowRight size={14} /></Link></div>
      {data.recent.length ? (
        <div className="transaction-list">
          {data.recent.map((row) => (
            <Link key={row.id} href={`/transactions/${row.id}/edit`} className="transaction-row">
              <span className="category-orb" style={{ backgroundColor: `${row.categoryColor}24`, color: row.categoryColor }}>{row.categoryEmoji}</span>
              <span className="transaction-main"><strong>{row.note || row.categoryName}</strong><small>{row.categoryName} · {PAYMENT_METHODS[row.paymentMethod as PaymentMethod] || '其他'} · {row.memberName}</small></span>
              <span className={row.type === 'income' ? 'transaction-amount income' : 'transaction-amount'}>{row.type === 'income' ? '+' : '−'} {formatMoney(row.amountCents)}<small>{Number(row.occurredOn.slice(5, 7))}月{Number(row.occurredOn.slice(8, 10))}日</small></span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state"><span>🧾</span><h3>还没有账目</h3><p>从今天开始，记下第一笔收入或支出。</p><Link href="/add" className="button primary">记一笔</Link></div>
      )}
    </div>
  );
}
