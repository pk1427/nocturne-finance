"use client";

import { WalletProvider } from "@/hooks/useLaceWallet";

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
