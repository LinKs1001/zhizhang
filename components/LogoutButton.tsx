'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setPending(false);
    }
  }
  return <button type="button" className={compact ? 'icon-button logout-compact' : 'button subtle'} onClick={logout} disabled={pending} aria-label="退出登录"><LogOut size={17} />{!compact && <span>{pending ? '正在退出…' : '退出登录'}</span>}</button>;
}
