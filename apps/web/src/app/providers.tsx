"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/auth-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 10_000 },
        },
      }),
  );
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ConvexProvider>
  );
}
