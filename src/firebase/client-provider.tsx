'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * This client-side component ensures that Firebase is initialized
 * exactly once when the application loads in the browser.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // The useMemo hook with an empty dependency array ensures that
  // `initializeFirebase()` is called only once per component lifecycle.
  // The function itself is idempotent, so subsequent calls are safe
  // and will return the already-initialized services.
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}