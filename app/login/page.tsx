import { redirect } from 'next/navigation';
import { AuthFrame } from '@/components/AuthFrame';
import { LoginForm } from '@/components/LoginForm';
import { getCurrentUser } from '@/lib/auth';
import { isSetupComplete } from '@/lib/server/household';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (!(await isSetupComplete())) redirect('/setup');
  if (await getCurrentUser()) redirect('/');
  return <AuthFrame title="智账" subtitle="家庭收支记录"><LoginForm /></AuthFrame>;
}
