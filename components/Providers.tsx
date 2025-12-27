'use client';

import { SessionProvider } from 'next-auth/react';
import { GeneratingBookProvider } from '@/contexts/GeneratingBookContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GeneratingBookProvider>
        {children}
      </GeneratingBookProvider>
    </SessionProvider>
  );
}
