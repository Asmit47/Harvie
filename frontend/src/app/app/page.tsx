import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { HarvieDashboard } from '@/components/harvie-dashboard';

export default async function HarvieAppPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  return (
    <div className="alcor-app-shell">
      <div className="alcor-app-account" aria-label="Authenticated account">
        <span>Connected as {userId}</span>
        <UserButton />
      </div>
      <HarvieDashboard />
    </div>
  );
}
