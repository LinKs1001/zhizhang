'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export function CategoryForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [emoji, setEmoji] = useState('✨');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try {
      const response = await fetch('/api/categories', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, type, emoji }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '添加失败');
      setName(''); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '添加失败'); }
    finally { setPending(false); }
  }
  return <form className="category-form" onSubmit={submit}><input className="emoji-input" value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={4} aria-label="分类图标" /><input value={name} onChange={(event) => setName(event.target.value)} maxLength={12} placeholder="新分类名称" required /><select value={type} onChange={(event) => setType(event.target.value as 'expense' | 'income')}><option value="expense">支出</option><option value="income">收入</option></select><button className="button small ghost" disabled={pending}><Plus size={14} />{pending ? '添加中…' : '添加'}</button>{error && <span className="error-text">{error}</span>}</form>;
}
