'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export function SetupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ setupToken: '', username: '', password: '', displayName: '', householdName: '我们家' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '初始化失败');
      router.replace('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '初始化失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field"><span>初始化令牌</span><input type="password" value={form.setupToken} onChange={update('setupToken')} placeholder="服务器环境变量中的 SETUP_TOKEN" required /></label>
      <label className="field"><span>你的用户名</span><input autoComplete="username" value={form.username} onChange={update('username')} placeholder="3–24 位字母、数字或下划线" required /></label>
      <label className="field"><span>显示称呼</span><input value={form.displayName} onChange={update('displayName')} placeholder="例如：小满" maxLength={20} required /></label>
      <label className="field"><span>设置密码</span><input type="password" autoComplete="new-password" value={form.password} onChange={update('password')} placeholder="至少 8 位" minLength={8} required /></label>
      <label className="field"><span>家庭账本名称</span><input value={form.householdName} onChange={update('householdName')} placeholder="我们家" maxLength={24} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary wide" disabled={pending}>{pending ? '正在创建…' : '创建家庭账本'}<ArrowRight size={17} /></button>
      <p className="form-tip">初始化只可执行一次。创建完成后，通过邀请码添加另一位成员。</p>
    </form>
  );
}
