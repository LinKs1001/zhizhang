'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export function JoinForm({ code, householdName }: { code: string; householdName: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/invites/accept', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加入失败');
      router.replace('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加入失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="join-banner"><span>🏠</span><div><small>正在加入</small><strong>{householdName}</strong></div></div>
      <label className="field"><span>用户名</span><input autoComplete="username" value={form.username} onChange={update('username')} placeholder="3–24 位字母、数字或下划线" required /></label>
      <label className="field"><span>显示称呼</span><input value={form.displayName} onChange={update('displayName')} placeholder="例如：阿树" maxLength={20} required /></label>
      <label className="field"><span>设置密码</span><input type="password" autoComplete="new-password" value={form.password} onChange={update('password')} placeholder="至少 8 位" minLength={8} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary wide" disabled={pending}>{pending ? '正在加入…' : '加入家庭账本'}<ArrowRight size={17} /></button>
    </form>
  );
}
