'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, List, ChartNoAxesColumnIncreasing, Settings, Plus } from 'lucide-react';

const sideItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/transactions', label: '明细', icon: List },
];

const rightItems = [
  { href: '/analysis', label: '分析', icon: ChartNoAxesColumnIncreasing },
  { href: '/settings', label: '设置', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const active = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {sideItems.map((item) => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className={active(item.href) ? 'bottom-item active' : 'bottom-item'}><Icon size={21} /><span>{item.label}</span></Link>;
      })}
      <Link href="/add" className={pathname === '/add' ? 'bottom-add active' : 'bottom-add'} aria-label="记一笔"><span><Plus size={25} /></span><small>记一笔</small></Link>
      {rightItems.map((item) => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className={active(item.href) ? 'bottom-item active' : 'bottom-item'}><Icon size={21} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
