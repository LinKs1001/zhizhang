import Link from 'next/link';
import { Download, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react';
import { redirect } from 'next/navigation';
import { InvitePanel } from '@/components/InvitePanel';
import { BudgetForm } from '@/components/BudgetForm';
import { CategoryForm } from '@/components/CategoryForm';
import { LogoutButton } from '@/components/LogoutButton';
import { getCurrentUser } from '@/lib/auth';
import { getHouseholdContext } from '@/lib/server/household';
import { getBudgetSettings, getCategories } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const context = await getHouseholdContext(user.id);
  const categories = await getCategories(context.householdId);
  const budgetRows = await getBudgetSettings(context.householdId);
  const totalCents = budgetRows.find((row) => row.scope === 'total')?.amountCents ?? 0;
  const categoryBudgets = Object.fromEntries(budgetRows.filter((row) => row.scope === 'category' && row.categoryId).map((row) => [row.categoryId!, row.amountCents]));
  const expenseCategories = categories.filter((category) => category.type === 'expense').map(({ id, name, emoji }) => ({ id, name, emoji }));
  return (
    <div className="page settings-page">
      <header className="page-head"><p className="eyebrow">家庭设置</p><h1>把账本调成你们喜欢的样子</h1><p>成员、预算、分类和数据都集中在这里。</p></header>
      <div className="settings-grid">
        <section className="card settings-card">
          <div className="section-line"><span className="settings-title"><UsersRound size={17} />家庭与成员</span><span className="soft-tag">{context.members.length}/2</span></div>
          <div className="member-list">{context.members.map((member, index) => <div key={member.id} className="member-item"><span className={index === 0 ? 'avatar avatar-dark' : 'avatar avatar-sage'}>{member.displayName.slice(0, 1)}</span><div><strong>{member.displayName}{member.id === user.id ? ' · 我' : ''}</strong><small>@{member.username} · {member.role === 'owner' ? '创建者' : '成员'}</small></div></div>)}</div>
          {context.role === 'owner' ? <InvitePanel full={context.members.length >= 2} /> : <p className="form-tip">邀请另一位成员需要由账本创建者操作。</p>}
        </section>

        <section className="card settings-card">
          <div className="section-line"><span className="settings-title">每月预算</span><span className="soft-tag">人民币</span></div>
          <BudgetForm totalCents={totalCents} categories={expenseCategories} categoryBudgets={categoryBudgets} />
        </section>

        <section className="card settings-card">
          <div className="section-line"><span className="settings-title">分类管理</span><span className="soft-tag">{categories.length} 个</span></div>
          <CategoryForm />
          <div className="category-cloud">{categories.map((category) => <span key={category.id}>{category.emoji} {category.name}</span>)}</div>
        </section>

        <section className="card settings-card">
          <div className="section-line"><span className="settings-title"><ShieldCheck size={17} />数据与隐私</span></div>
          <div className="info-line"><LockKeyhole size={17} /><div><strong>隐私消费</strong><p>开启隐私消费的账目只对录入者可见，不进入共同账本和家庭统计。</p></div></div>
          <div className="info-line"><Download size={17} /><div><strong>导出明细</strong><p>随时把共同账目和你的隐私消费导出为 CSV。</p><Link className="text-link" href="/api/export">下载 CSV</Link></div></div>
          <div className="settings-actions"><LogoutButton /></div>
        </section>
      </div>
      <div className="settings-foot"><img src="/icons/icon-192.png" alt="" width={40} height={40} /><div><strong>智账</strong><p>可安装到手机桌面，记录更快一步。</p></div></div>
    </div>
  );
}
