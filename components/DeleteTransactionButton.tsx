'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

export function DeleteTransactionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function remove() {
    if (!window.confirm('确定删除这笔账吗？')) return;
    setPending(true);
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '删除失败');
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }
  return <button type="button" className="icon-button danger" onClick={remove} disabled={pending} aria-label="删除账目"><Trash2 size={15} /></button>;
}
