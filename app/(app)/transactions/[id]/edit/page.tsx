import { notFound, redirect } from 'next/navigation';
import { EntryForm } from '@/components/EntryForm';
import { getCurrentUser } from '@/lib/auth';
import { getHouseholdContext } from '@/lib/server/household';
import { getCategories, getTransactionById } from '@/lib/server/queries';
import type { PaymentMethod } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const transaction = await getTransactionById(user.id, id);
  if (!transaction) notFound();
  const context = await getHouseholdContext(user.id);
  const categories = await getCategories(context.householdId);
  return <div className="page"><EntryForm members={context.members.map(({ id, displayName }) => ({ id, displayName }))} categories={categories.map(({ id, name, type, emoji, color }) => ({ id, name, type, emoji, color }))} currentUserId={user.id} initial={{ id: transaction.id, type: transaction.type, amount: String(transaction.originalAmount), currency: transaction.currency, categoryId: transaction.categoryId, memberId: transaction.memberUserId, occurredOn: transaction.occurredOn, note: transaction.note, paymentMethod: transaction.paymentMethod as PaymentMethod, scope: transaction.scope, visibility: transaction.visibility }} /></div>;
}
