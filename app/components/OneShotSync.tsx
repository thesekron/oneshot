/**
 * OneShotSync.tsx
 *
 * Side-effect component that bridges the Excalidraw canvas with the active
 * cloud-sync strategy (Ably relay or Supabase database).
 *
 * It registers the debounced save function from useCloudSync into the jotai
 * atom that App.tsx's onChange handler reads, keeping App.tsx untouched.
 */

import { useEffect } from "react";

import { appJotaiStore } from "app/app-jotai";

import { useCloudSync } from "../hooks/useCloudSync";
import { oneShotSaveFnAtom } from "../oneshot-jotai";

export const OneShotSync = () => {
  const saveFn = useCloudSync();

  useEffect(() => {
    appJotaiStore.set(oneShotSaveFnAtom, saveFn);
    return () => {
      appJotaiStore.set(oneShotSaveFnAtom, null);
    };
  }, [saveFn]);

  // Purely a side-effect component – renders nothing
  return null;
};
