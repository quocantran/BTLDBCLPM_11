"use client";

import { useEffect, useState } from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { NotificationSocketProvider } from "@/providers/NotificationProvider";

const queryClient = new QueryClient();

// Client-only wrapper component
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

export function Web3Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly>
      <QueryClientProvider client={queryClient}>
        <NotificationSocketProvider>{children}</NotificationSocketProvider>
      </QueryClientProvider>
    </ClientOnly>
  );
}
