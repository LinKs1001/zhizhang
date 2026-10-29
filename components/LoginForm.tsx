'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'invite'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === 'invite') {
      const normalized = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (normalized.length < 6) {
        setError('请输入完整的邀请码');
        return;
      }
      router.push(`/join/${normalized}`);
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '登录失败');
      router.replace('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="segmented" role="tablist" aria-label="登录方式">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>登录</button>
        <button type="button" className={mode === 'invite' ? 'active' : ''} onClick={() => { setMode('invite'); setError(''); }}>邀请码加入</button>
      </div>
      {mode === 'login' ? (
        <>
          <label className="field"><span>用户名</span><div className="input-with-icon"><UserRound size={16} /><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="输入用户名" required /></div></label>
          <label className="field"><span>密码</span><div className="input-with-icon"><LockKeyhole size={16} /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入密码" required /></div></label>
          <button className="button primary wide" disabled={pending}>{pending ? '登录中…' : '登录'}<ArrowRight size={17} /></button>
        </>
      ) : (
        <>
          <label className="field"><span>8 位邀请码</span><div className="input-with-icon"><UserRound size={16} /><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="输入 TA 发给你的邀请码" maxLength={12} required /></div></label>
          <button className="button primary wide">继续加入<ArrowRight size={17} /></button>
          <p className="form-tip">邀请码由家庭账本的创建者生成，仅能使用一次。</p>
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="register-link"><span>第一次使用智账？</span><a href="/setup">注册家庭账本</a></div>
      <div className="auth-divider"><span>只有收到邀请，才能加入这个家</span></div>
      <button type="button" className="invite-shortcut" onClick={() => { setMode('invite'); setError(''); }}>
        <span className="shortcut-icon">🔒</span><span><strong>收到了邀请？</strong><small>使用邀请码加入同一个家庭账本</small></span><ArrowRight size={15} />
      </button>
    </form>
  );
}

