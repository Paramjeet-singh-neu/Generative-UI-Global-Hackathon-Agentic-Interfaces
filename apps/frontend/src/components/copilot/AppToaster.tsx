"use client";

import { Toaster } from "sonner";

/** Single Sonner mount for runtime-wide toasts (incl. CopilotKit `onError`). */
export function AppToaster() {
  return <Toaster richColors position="top-center" />;
}
