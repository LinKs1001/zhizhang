import Link from 'next/link';
import { ArrowRight, Filter, LockKeyhole, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { DeleteTransactionButton } from '@/components/DeleteTransactionButton';
import { getCurrentUser } from '@/lib/auth';
import { PAYMENT_METHODS, TRANSACTION_TYPES, type PaymentMethod } from '@/lib/constants';
import { currentMonthKey, formatDateZh } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { getCategories, getTransactions } from '@/lib/server/queries';
import { getHouseholdContext } from '@/lib/server/household';

export const dynamic = 'force-dynamic';

type Search = { month?: string; type?: string; memberId?: string; categoryId?: string };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month || '') ? params.month! : currentMonthKey();
  const context = await getHouseholdContext(user.id);
  const categories = await getCategories(context.householdId);
  const rows = await getTransactions(user.id, { month, type: params.type, memberId: params.memberId, categoryId: params.categoryId, includePrivate: true });
  const expense = rows.filter((row) => row.type === 'expense' && row.visibility === 'shared').reduce((sum, row) => sum + row.amountCents, 0);
  const income = rows.filter((row) => row.type === 'income' && row.visibility === 'shared').reduce((sum, row) => sum + row.amountCents, 0);
  return (
    <div className="page">
      <header className="page-head split-head">
        <div><p className="eyebrow">收支明细</p><h1>每一笔，都有迹可循</h1><p>共同账目与你的隐私消费都在这里。</p></div>
        <Link href="/add" className="button primary desktop-add"><Plus size={17} />记一笔</Link>
      </header>
      <div className="list-toolbar"><MonthSwitcher month={month} path="/transactions" /><div className="list-totals"><span>收入 <b>{formatMoney(income)}</b></span><span>支出 <b>{formatMoney(expense)}</b></span></div></div>
      <form className="filter-bar" method="get">
        <input type="hidden" name="month" value={month} />
        <span className="filter-label"><Filter size={14} />筛选</span>
        <select name="type" defaultValue={params.type || ''} aria-label="类型"><option value="">全部类型</option>{Object.entries(TRANSACTION_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select name="memberId" defaultValue={params.memberId || ''} aria-label="成员"><option value="">全部成员</option>{context.members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select>
        <select name="categoryId" defaultValue={params.categoryId || ''} aria-label="分类"><option value="">全部分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.emoji} {category.name}</option>)}</select>
        <button className="button small ghost" type="submit">应用</button>
        {(params.type || params.memberId || params.categoryId) && <Link className="text-link" href={`/transactions?month=${month}`}>清除</Link>}
      </form>
      {rows.length ? (
        <div className="transaction-list detailed">
          {rows.map((row) => (
            <div className="transaction-row" key={row.id}>
              <span className="category-orb" style={{ backgroundColor: `${row.categoryColor}24`, color: row.categoryColor }}>{row.categoryEmoji}</span>
              <Link href={`/transactions/${row.id}/edit`} className="transaction-main"><strong>{row.note || row.categoryName}{row.visibility === 'private' && <em className="private-badge"><LockKeyhole size={10} />隐私</em>}</strong><small>{formatDateZh(row.occurredOn)} · {row.categoryName} · {PAYMENT_METHODS[row.paymentMethod as PaymentMethod]} · {row.memberName}</small></Link>
              <span className={row.type === 'income' ? 'transaction-amount income' : 'transaction-amount'}>{row.type === 'income' ? '+' : '−'} {formatMoney(row.amountCents)}<small>{row.currency !== 'CNY' ? `${row.currency} ${row.originalAmount.toFixed(2)}` : TRANSACTION_TYPES[row.type]}</small></span>
              <div className="row-actions"><Link href={`/transactions/${row.id}/edit`} className="icon-button" aria-label="编辑账目"><ArrowRight size={15} /></Link><DeleteTransactionButton id={row.id} /></div>
            </div>
          ))}
        </div>
      ) : <div className="empty-state"><span>📒</span><h3>这个月还没有符合条件的账目</h3><p>换一个月份或筛选条件试试。</p><Link href="/add" className="button primary"><Plus size={16} />记一笔</Link></div>}
    </div>
  );
}
