import React from 'react';
import { ClerkProvider } from '@clerk/react';
import { AUTH_ENABLED, CLERK_PUBLISHABLE_KEY } from '../lib/feature-flags';

/** Wraps children with ClerkProvider only when a real publishable key is configured. */
export const ClerkGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!AUTH_ENABLED) return <>{children}</>;
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/app"
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
    >
      {children}
    </ClerkProvider>
  );
};
