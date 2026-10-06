'use client';

import Link from 'next/link';
import { Show, SignInButton, SignUpButton } from '@clerk/nextjs';
import { ArrowUpRight } from 'lucide-react';

const clerkOn = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const primaryClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#F59E5B] px-5 text-sm font-semibold text-[#1A0E05] transition-colors duration-200 hover:bg-[#FFB27A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F59E5B]';

const compactClass =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#F59E5B] px-3.5 text-[13px] font-semibold text-[#1A0E05] transition-colors duration-200 hover:bg-[#FFB27A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F59E5B]';

const quietClass =
  'text-sm text-[#A1A4AB] transition-colors hover:text-[#EDEDEF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F59E5B]';

export function GetStarted({ compact = false }: { compact?: boolean }) {
  const className = compact ? compactClass : primaryClass;
  const label = (
    <>
      Get started <ArrowUpRight aria-hidden="true" size={compact ? 14 : 16} strokeWidth={1.8} />
    </>
  );

  if (!clerkOn) {
    return (
      <Link href="/sign-up" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignUpButton forceRedirectUrl="/app">
          <button type="button" className={className}>
            {label}
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link href="/app" className={className}>
          Open Harvie <ArrowUpRight aria-hidden="true" size={compact ? 14 : 16} strokeWidth={1.8} />
        </Link>
      </Show>
    </>
  );
}

export function SignInLink() {
  if (!clerkOn) {
    return (
      <Link href="/sign-in" className={quietClass}>
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton forceRedirectUrl="/app">
          <button type="button" className={quietClass}>
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link href="/app" className={quietClass}>
          Open app
        </Link>
      </Show>
    </>
  );
}
