"use client";

import { ReactNode, useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  InitializeFarcasterMiniApp,
  useInitializeFarcasterApp,
} from "@/neynar-farcaster-sdk/mini";
import { Toaster } from "@neynar/ui";
import { wagmiConfig } from "@/lib/celo-config";

// FIX: useInitializeFarcasterApp precisa estar DENTRO do WagmiProvider.
// Extraído para componente filho para garantir isso.
function AppInitializer() {
  useInitializeFarcasterApp();
  return <InitializeFarcasterMiniApp />;
}

export function ProvidersAndInitialization({
  children,
}: {
  children: ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <JotaiProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster position="top-center" richColors />
          {/* AppInitializer agora está dentro do WagmiProvider */}
          <AppInitializer />
          {children}
        </QueryClientProvider>
      </JotaiProvider>
    </WagmiProvider>
  );
}
