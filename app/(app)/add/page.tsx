import { redirect } from 'next/navigation';
import { EntryForm } from '@/components/EntryForm';
import { getCurrentUser } from '@/lib/auth';
import { getHouseholdContext } from '@/lib/server/household';
import { getCategories } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

export default async function AddPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const context = await getHouseholdContext(user.id);
  const categories = await getCategories(context.householdId);
  return <div className="page"><EntryForm members={context.members.map(({ id, displayName }) => ({ id, displayName }))} categories={categories.map(({ id, name, type, emoji, color }) => ({ id, name, type, emoji, color }))} currentUserId={user.id} /></div>;
}
