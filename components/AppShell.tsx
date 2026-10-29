import Image from 'next/image';
import { Home, List, ChartNoAxesColumnIncreasing, Settings } from 'lucide-react';
import Link from 'next/link';
import { BrandIcon } from '@/components/BrandIcon';
import { SideNav } from '@/components/SideNav';
import { BottomNav } from '@/components/BottomNav';
import { LogoutButton } from '@/components/LogoutButton';
import { LiveRefresh } from '@/components/LiveRefresh';

type Props = {
  user: { displayName: string; username: string };
  householdName: string;
  members: Array<{ id: string; displayName: string }>;
  children: React.ReactNode;
};

export function AppShell({ user, householdName, members, children }: Props) {
  return (
    <div className="app-shell">
      <aside className="side-rail">
        <Link href="/" className="rail-brand">
          <BrandIcon size={44} />
          <div><strong>智账</strong><span>{householdName}</span></div>
        </Link>
        <SideNav />
        <div className="rail-footer">
          <div className="rail-member-stack">
            {members.map((member, index) => <span key={member.id} className={index === 0 ? 'avatar avatar-dark' : 'avatar avatar-sage'}>{member.displayName.slice(0, 1)}</span>)}
          </div>
          <div className="rail-user"><strong>{user.displayName}</strong><span>@{user.username}</span></div>
          <LogoutButton compact />
        </div>
      </aside>
      <div className="app-stage">
        <main className="app-main">{children}</main>
        <BottomNav />
      </div>
      <LiveRefresh />
    </div>
  );
}
