'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Category = { id: string; name: string; emoji: string };

export function BudgetForm({ totalCents, categories, categoryBudgets }: { totalCents: number; categories: Category[]; categoryBudgets: Record<string, number> }) {
  const router = useRouter();
  const [total, setTotal] = useState(totalCents ? String(totalCents / 100) : '');
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(categories.map((category) => [category.id, categoryBudgets[category.id] ? String(categoryBudgets[category.id] / 100) : ''])));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/budgets', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ totalCents: Math.round(Number(total || 0) * 100), categories: categories.map((category) => ({ categoryId: category.id, amountCents: Math.round(Number(values[category.id] || 0) * 100) })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      setMessage('预算已保存');
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setPending(false); }
  }
  return (
    <form className="settings-form" onSubmit={submit}>
      <label className="field"><span>每月总预算</span><div className="money-input"><b>¥</b><input inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="0.00" /></div></label>
      <div className="budget-grid">{categories.map((category) => <label className="field compact" key={category.id}><span>{category.emoji} {category.name}</span><div className="money-input"><b>¥</b><input inputMode="decimal" value={values[category.id]} onChange={(event) => setValues((current) => ({ ...current, [category.id]: event.target.value }))} placeholder="不设置" /></div></label>)}</div>
      {error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
      <button className="button primary" disabled={pending}><Save size={15} />{pending ? '保存中…' : '保存预算'}</button>
    </form>
  );
}
