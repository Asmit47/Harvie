'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  const tree = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  if (!publishableKey) return tree;

  return <ClerkProvider publishableKey={publishableKey}>{tree}</ClerkProvider>;
}

