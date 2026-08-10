"use client";

import { useEffect, useCallback, useState } from "react";

type WalletState = {
  isConnected: boolean;
  address: string | null;
  networkId: number | null;
  error: string | null;
};

type LaceAPI = {
  getAddress: () => Promise<string>;
  getNetworkId: () => Promise<number>;
  signTx: (tx: unknown) => Promise<unknown>;
  submitTx: (tx: unknown) => Promise<unknown>;
};

declare global {
  interface Window {
    lace?: {
      enable: () => Promise<LaceAPI>;
      isEnabled: () => Promise<boolean>;
    };
  }
}

const EXPECTED_NETWORK_ID = 2; // preview = 2, preprod = 1, mainnet = 0

export function useLaceWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    networkId: null,
    error: null,
  });
  const [api, setApi] = useState<LaceAPI | null>(null);

  const checkConnection = useCallback(async () => {
    if (typeof window === "undefined" || !window.lace) {
      return;
    }
    try {
      const enabled = await window.lace.isEnabled();
      if (enabled) {
        const laceApi = await window.lace.enable();
        const address = await laceApi.getAddress();
        const networkId = await laceApi.getNetworkId();
        setApi(laceApi);
        setState({
          isConnected: true,
          address,
          networkId,
          error: networkId !== EXPECTED_NETWORK_ID ? "Wrong network" : null,
        });
      }
    } catch {
      // Not connected
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // Listen for account changes
    const handleAccountsChanged = () => {
      checkConnection();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("lace:accountChanged", handleAccountsChanged as EventListener);
      return () => {
        window.removeEventListener("lace:accountChanged", handleAccountsChanged as EventListener);
      };
    }
  }, [checkConnection]);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.lace) {
      setState((s) => ({ ...s, error: "Lace wallet not detected" }));
      return;
    }
    try {
      const laceApi = await window.lace.enable();
      const address = await laceApi.getAddress();
      const networkId = await laceApi.getNetworkId();
      setApi(laceApi);
      setState({
        isConnected: true,
        address,
        networkId,
        error: networkId !== EXPECTED_NETWORK_ID ? "Please switch to preview network" : null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setApi(null);
    setState({
      isConnected: false,
      address: null,
      networkId: null,
      error: null,
    });
  }, []);

  const signAndSubmit = useCallback(
    async (tx: unknown) => {
      if (!api) throw new Error("Wallet not connected");
      const signed = await api.signTx(tx);
      return api.submitTx(signed);
    },
    [api]
  );

  return {
    ...state,
    connect,
    disconnect,
    signAndSubmit,
    isCorrectNetwork: state.networkId === EXPECTED_NETWORK_ID,
  };
}
