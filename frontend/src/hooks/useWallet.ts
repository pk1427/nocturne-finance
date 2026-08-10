"use client";

import { useEffect, useState, useCallback } from "react";

const INTERACT_SERVER_URL = process.env.NEXT_PUBLIC_INTERACT_SERVER_URL || "http://localhost:6301";

type WalletInfo = {
  address: string;
  network: string;
  contractAddress: string | null;
};

type WalletState = {
  info: WalletInfo | null;
  loading: boolean;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    info: null,
    loading: true,
    error: null,
  });

  const fetchWalletInfo = useCallback(async () => {
    try {
      const res = await fetch(`${INTERACT_SERVER_URL}/api/wallet`);
      if (!res.ok) throw new Error("Failed to fetch wallet info");
      const data: WalletInfo = await res.json();
      setState({ info: data, loading: false, error: null });
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message || "Failed to load wallet" }));
    }
  }, []);

  useEffect(() => {
    fetchWalletInfo();
    const interval = setInterval(fetchWalletInfo, 30000);
    return () => clearInterval(interval);
  }, [fetchWalletInfo]);

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 16) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
  };

  return {
    ...state,
    refresh: fetchWalletInfo,
    formatAddress,
  };
}
