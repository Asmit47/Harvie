import { auth } from '@clerk/nextjs/server';
import { HarvieDashboard } from '@/components/harvie-dashboard';

export default async function HarvieAppPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  return <HarvieDashboard key={userId} userId={userId} />;
}
