// src/app/(dashboard)/tickets/[id]/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function TicketDetailRedirect({ params }: { params: { id: string } }) {
  // Await params for Next.js 15+
  const { id } = await params;
  
  const cookieStore = await cookies();
  const userRole = cookieStore.get('user_role')?.value || 'USER';

  // 1. Redirect Admins/Assignees to the Admin Console view
  if (userRole === 'ADMIN' || userRole === 'ASSIGNEE') {
    redirect(`/admin/tickets/${id}`);
  }

  // 2. Redirect regular Users to the User Dashboard view
  redirect(`/user/tickets/${id}`);

  // Return null to satisfy React component requirements during redirect
  return null;
}
