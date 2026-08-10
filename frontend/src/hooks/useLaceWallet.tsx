"use client";

import { useEffect, useCallback, useState, createContext, useContext, ReactNode } from "react";

type WalletState = {
  isConnected: boolean;
  address: string | null;
  networkId: string | null;
  error: string | null;
};

type LaceConnectedAPI = {
  getConfiguration: () => Promise<{
    networkId: string;
    indexerUri: string;
    indexerWsUri: string;
    proverServerUri: string;
    [key: string]: unknown;
  }>;
  getShieldedAddresses: () => Promise<{ shieldedAddress: string }>;
  getUnshieldedAddress: () => Promise<{ unshieldedAddress: string }>;
  balanceUnsealedTransaction?: (tx: string) => Promise<{ tx: string }>;
  submitTransaction: (tx: string) => Promise<string>;
};

declare global {
  interface Window {
    midnight?: Record<string, any>;
  }
}

const WalletContext = createContext<{
  state: WalletState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmit: (tx: unknown) => Promise<string>;
  isCorrectNetwork: boolean;
} | null>(null);

const EXPECTED_NETWORKS = new Set(["preview", "preprod", "undeployed", "mainnet", "qanet"]);

function findWalletAPI(): any | null {
  const midnight = window.midnight;
  if (!midnight) return null;

  for (const key of Object.keys(midnight)) {
    const candidate = midnight[key];
    if (candidate && typeof candidate === "object" && typeof candidate.connect === "function") {
      return candidate;
    }
  }
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    networkId: null,
    error: null,
  });
  const [api, setApi] = useState<LaceConnectedAPI | null>(null);

  const connect = useCallback(async () => {
    const walletApi = findWalletAPI();
    if (!walletApi) {
      setState((s) => ({ ...s, error: "Lace wallet not detected" }));
      return;
    }

    try {
      const connected = await walletApi.connect("undeployed");
      const config = await connected.getConfiguration();
      const addresses = await connected.getShieldedAddresses();

      setApi(connected);
      setState({
        isConnected: true,
        address: addresses.shieldedAddress,
        networkId: config.networkId,
        error: EXPECTED_NETWORKS.has(config.networkId) ? null : "Please switch to a supported Midnight network",
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
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
      const serialized = (tx as any).serialize?.();
      if (!serialized) throw new Error("Cannot serialize transaction");
      const txHex = Buffer.from(serialized).toString("hex");
      const balanced = await api.balanceUnsealedTransaction?.(txHex);
      const finalTx = balanced?.tx ?? txHex;
      return api.submitTransaction(finalTx);
    },
    [api]
  );

  useEffect(() => {
    const checkConnection = async () => {
      const walletApi = findWalletAPI();
      if (!walletApi) return;
      try {
        const connected = await walletApi.connect("undeployed");
        const config = await connected.getConfiguration();
        const addresses = await connected.getShieldedAddresses();
        setApi(connected);
        setState({
          isConnected: true,
          address: addresses.shieldedAddress,
          networkId: config.networkId,
          error: EXPECTED_NETWORKS.has(config.networkId) ? null : "Please switch to a supported Midnight network",
        });
      } catch {
        // Not connected or user rejected
      }
    };

    checkConnection();

    const onReady = () => {
      checkConnection();
    };

    window.addEventListener("mnLace:initialized", onReady);
    window.addEventListener("mnLace:accountChanged", onReady);

    return () => {
      window.removeEventListener("mnLace:initialized", onReady);
      window.removeEventListener("mnLace:accountChanged", onReady);
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{
        state,
        connect,
        disconnect,
        signAndSubmit,
        isCorrectNetwork: state.networkId ? EXPECTED_NETWORKS.has(state.networkId) : false,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useLaceWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useLaceWallet must be used within a WalletProvider");
  }
  return {
    ...context.state,
    connect: context.connect,
    disconnect: context.disconnect,
    signAndSubmit: context.signAndSubmit,
    isCorrectNetwork: context.isCorrectNetwork,
  };
}
