// src/app/(dashboard)/tickets/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function TicketsRedirect() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('user_role')?.value || 'USER';

  if (userRole === 'ADMIN' || userRole === 'ASSIGNEE') {
    redirect('/admin/tickets');
  }

  // Changed from /tickets/create to /user/tickets
  redirect('/user/tickets');

  return null;
}
