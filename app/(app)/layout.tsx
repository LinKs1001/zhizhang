import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { getHouseholdContext, isSetupComplete } from '@/lib/server/household';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isSetupComplete())) redirect('/setup');
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  let context;
  try {
    context = await getHouseholdContext(user.id);
  } catch {
    redirect('/login');
  }
  return <AppShell user={user} householdName={context.householdName} members={context.members}>{children}</AppShell>;
}
