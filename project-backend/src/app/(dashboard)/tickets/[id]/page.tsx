// src/app/(dashboard)/tickets/[id]/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function TicketDetailRedirect({ params }: { params: { id: string } }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userRole = cookieStore.get('user_role')?.value || 'USER';

  // 1. If Staff, go to Admin Panel
  if (userRole === 'ADMIN' || userRole === 'ASSIGNEE') {
    redirect(`/admin/tickets/${id}`);
  }

  // 2. Everyone else goes to User Dashboard
  redirect(`/user/tickets/${id}`);

  return null; // Renders nothing
}
