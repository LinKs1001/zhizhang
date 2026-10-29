'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, List, ChartNoAxesColumnIncreasing, Settings } from 'lucide-react';

const items = [
  { href: '/', label: '首页', icon: Home },
  { href: '/transactions', label: '明细', icon: List },
  { href: '/analysis', label: '分析', icon: ChartNoAxesColumnIncreasing },
  { href: '/settings', label: '设置', icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="rail-nav" aria-label="主导航">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} className={active ? 'rail-link active' : 'rail-link'}><Icon size={19} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
