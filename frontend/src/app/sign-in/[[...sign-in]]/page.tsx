import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
      <SignIn fallbackRedirectUrl="/app" signUpUrl="/sign-up" />
    </div>
  );
}
