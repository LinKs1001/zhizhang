'use client';

import { useState } from 'react';
import { Copy, Link2, RefreshCw } from 'lucide-react';

export function InvitePanel({ full = false }: { full?: boolean }) {
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  async function create() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/invites', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '生成失败');
      setInvite(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '生成失败');
    } finally {
      setPending(false);
    }
  }
  async function copy() {
    if (!invite) return;
    await navigator.clipboard.writeText(`${window.location.origin}/join/${invite.code}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  if (full) return <div className="invite-box"><span className="invite-orb">👥</span><div><strong>家庭账本已有两位成员</strong><p>当前人数已满，其他账号无法再加入。</p></div></div>;
  return (
    <div className="invite-box">
      <span className="invite-orb">🔗</span>
      <div className="invite-content">
        <strong>邀请另一位成员</strong>
        {invite ? <div className="invite-result"><code>/join/{invite.code}</code><button type="button" className="icon-button" onClick={copy} aria-label="复制邀请链接"><Copy size={14} /></button></div> : <p>生成一次性邀请链接，7 天内有效。</p>}
        {copied && <small>已复制到剪贴板</small>}
        {error && <small className="error-text">{error}</small>}
      </div>
      <button type="button" className="button small ghost" onClick={create} disabled={pending}>{invite ? <RefreshCw size={14} /> : <Link2 size={14} />}{pending ? '生成中…' : invite ? '重新生成' : '生成链接'}</button>
    </div>
  );
}

