import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthFrame } from '@/components/AuthFrame';
import { JoinForm } from '@/components/JoinForm';
import { inspectInvite } from '@/lib/server/household';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (await getCurrentUser()) redirect('/');
  const invite = await inspectInvite(code);
  if (!invite) {
    return (
      <AuthFrame title="邀请已失效" subtitle="请让家人重新生成邀请码">
        <div className="empty-panel"><span>⌛</span><p>这个邀请码无效、已经使用或已经过期。</p><Link className="button primary wide" href="/login">返回登录</Link></div>
      </AuthFrame>
    );
  }
  return <AuthFrame title="加入家庭" subtitle="设置你的账号，就能一起记账"><JoinForm code={code} householdName={invite.householdName} /></AuthFrame>;
}
