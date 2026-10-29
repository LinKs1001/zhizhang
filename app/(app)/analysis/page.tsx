import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { AskBox } from '@/components/AskBox';
import { getCurrentUser } from '@/lib/auth';
import { currentMonthKey, formatMonthZh } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { getAnalysisData } from '@/lib/server/queries';
import { getMonthlyNarrative } from '@/lib/server/insights';

export const dynamic = 'force-dynamic';

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month || '') ? params.month! : currentMonthKey();
  const data = await getAnalysisData(user.id, month);
  const narrative = await getMonthlyNarrative(user.id, month);
  const maxTrend = Math.max(...data.trend.map((item) => item.expenseCents), 1);
  const totalExpense = data.expenseCents || 1;
  let cursor = 0;
  const gradient = data.categoryBreakdown.length
    ? data.categoryBreakdown.map((item) => {
        const start = cursor;
        cursor += (item.amountCents / totalExpense) * 100;
        return `${item.color} ${start}% ${cursor}%`;
      }).join(', ')
    : '#e7e1d5 0% 100%';
  const memberTotal = data.memberContribution.reduce((sum, item) => sum + item.amountCents, 0) || 1;
  return (
    <div className="page">
      <header className="page-head split-head"><div><p className="eyebrow">消费洞察</p><h1>分析月报</h1><p>数字看懂之后，日子会更从容。</p></div><MonthSwitcher month={month} path="/analysis" /></header>
      <div className="kpi-row">
        <div className="kpi"><span>本月支出</span><strong>{formatMoney(data.expenseCents)}</strong></div>
        <div className="kpi income"><span>本月收入</span><strong>{formatMoney(data.incomeCents)}</strong></div>
        <div className="kpi saving"><span>本月结余</span><strong>{formatMoney(data.balanceCents)}</strong></div>
      </div>
      <div className="analysis-grid">
        <section className="card trend-card">
          <div className="section-line"><strong>近 6 个月支出</strong><span>{data.transactionCount} 笔记录</span></div>
          <div className="trend-chart" aria-label="近六个月支出趋势">
            {data.trend.map((item, index) => <div className={`trend-bar ${index === data.trend.length - 1 ? 'current' : ''}`} key={item.month}><span>{item.expenseCents > 0 ? formatMoney(item.expenseCents).replace('¥', '') : ''}</span><i style={{ height: `${Math.max(5, (item.expenseCents / maxTrend) * 100)}%` }} /><small>{Number(item.month.slice(5))}月</small></div>)}
          </div>
        </section>
        <section className="card category-card">
          <div className="section-line"><strong>支出分类</strong><span>按金额排序</span></div>
          {data.categoryBreakdown.length ? <div className="category-body"><div className="donut" style={{ background: `conic-gradient(${gradient})` }}><div><span>总支出</span><strong>{formatMoney(data.expenseCents)}</strong></div></div><div className="legend-list">{data.categoryBreakdown.slice(0, 6).map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.emoji} {item.name}</span><b>{Math.round((item.amountCents / totalExpense) * 100)}%</b></div>)}</div></div> : <p className="empty-copy">本月还没有支出记录。</p>}
        </section>
        <section className="card member-card">
          <div className="section-line"><strong>本月谁来买单</strong><span>共同账本</span></div>
          {data.memberContribution.length ? data.memberContribution.map((item, index) => <div className="member-bar" key={item.name}><div><b>{item.name}</b><span>{formatMoney(item.amountCents)} · {Math.round((item.amountCents / memberTotal) * 100)}%</span></div><i><em className={index === 0 ? 'sage' : 'gold'} style={{ width: `${(item.amountCents / memberTotal) * 100}%` }} /></i></div>) : <p className="empty-copy">还没有成员支出。</p>}
        </section>
        <section className="card report-card">
          <div className="section-line"><span className="summary-title"><span>✦</span>本月小结</span><span className="soft-tag">自动更新</span></div>
          <p>{narrative}</p>
          {data.totalBudgetCents > 0 ? <div className="budget-pill"><span>预算进度</span><strong>{data.budgetUsedPct ?? 0}%</strong></div> : <Link href="/settings" className="text-link">设置本月预算 <ArrowRight size={13} /></Link>}
        </section>
      </div>
      <AskBox />
      {data.transactionCount === 0 && <div className="empty-state compact"><span>📊</span><p>有了账目之后，这里会自动长出趋势和建议。</p><Link href="/add" className="button primary">先记一笔</Link></div>}
    </div>
  );
}
