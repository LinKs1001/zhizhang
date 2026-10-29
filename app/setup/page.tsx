import Link from 'next/link';
import { AuthFrame } from '@/components/AuthFrame';
import { SetupForm } from '@/components/SetupForm';
import { isSetupComplete } from '@/lib/server/household';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  if (await isSetupComplete()) {
    return <AuthFrame title="账本已初始化" subtitle="这个部署已经有家庭账本了"><div className="empty-panel"><span>🔒</span><p>首次注册只在空账本中开放。如果你是第二位成员，请使用家庭创建者发来的邀请码加入。</p><Link className="button primary wide" href="/login">返回登录</Link></div></AuthFrame>;
  }
  return <AuthFrame title="初始化智账" subtitle="先创建家庭账本，再邀请另一位成员"><SetupForm /></AuthFrame>;
}
