import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0B0D] p-4">
      <SignUp fallbackRedirectUrl="/app" signInUrl="/sign-in" />
    </div>
  );
}
