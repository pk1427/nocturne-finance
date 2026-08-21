"use client";

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

type WalletState = {
  isConnected: boolean;
  address: string | null;
  unshieldedAddress: string | null;
  networkId: string | null;
  error: string | null;
};

type WalletContextValue = {
  state: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSubmit: (tx: unknown) => Promise<void>;
  isCorrectNetwork: boolean;
  api: ConnectedAPI | null;
  version: "v4" | null;
  dustBalance: bigint;
  dustSymbol: string;
  refreshBalances: () => Promise<void>;
  unshieldedAddress: string | null;
};

const WalletContext = createContext<WalletContextValue | null>(null);
const WALLET_NETWORK = process.env.NEXT_PUBLIC_NETWORK || "preview";
const EXPECTED_NETWORKS = new Set(["preview", "preprod", "undeployed", "mainnet", "qanet"]);

function uint8ArrayToHex(data: Uint8Array): string {
  return Array.from(data, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function selectWallet(): InitialAPI {
  if (typeof window === "undefined" || !window.midnight) {
    throw new Error("No Midnight wallet found. Please install a Midnight wallet extension.");
  }

  const wallets = Object.values(window.midnight) as InitialAPI[];
  const wallet = wallets[0] ?? window.midnight.mnLace ?? window.midnight.lace;
  if (!wallet) throw new Error("No Midnight wallet found. Please install a Midnight wallet extension.");
  return wallet;
}

function userFacingError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Unauthorized request origin")) return "Please authorize this site in Lace, then try again.";
  if (/locked|password|unlock/i.test(message)) return "Lace is locked. Unlock it in the extension and try again.";
  if (/rejected|cancelled|canceled/i.test(message)) return "Request rejected in Lace.";
  return message || "Wallet connection failed";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({ isConnected: false, address: null, unshieldedAddress: null, networkId: null, error: null });
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [dustBalance, setDustBalance] = useState(0n);

  const refreshBalances = useCallback(async () => {
    if (!api) return;
    try {
      setDustBalance((await api.getDustBalance()).balance);
    } catch (error) {
      setState((current) => ({ ...current, error: userFacingError(error) }));
    }
  }, [api]);

  const connect = useCallback(async () => {
    setState((current) => ({ ...current, error: null }));
    try {
      const connectedApi = await selectWallet().connect(WALLET_NETWORK);
      const [configuration, addresses, dust] = await Promise.all([
        connectedApi.getConfiguration(),
        connectedApi.getShieldedAddresses(),
        connectedApi.getDustBalance(),
      ]);
      const connection = await connectedApi.getConnectionStatus();
      if (connection.status !== "connected") throw new Error("Wallet connection lost. Please try again.");

      const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();

      setApi(connectedApi);
      setDustBalance(dust.balance);
      setState({
        isConnected: true,
        address: addresses.shieldedAddress,
        unshieldedAddress,
        networkId: configuration.networkId,
        error: EXPECTED_NETWORKS.has(configuration.networkId) ? null : `Please switch to a supported Midnight network (current: ${configuration.networkId})`,
      });
      setTimeout(() => {
        try { window.focus(); } catch { /* noop */ }
        try { document.body.click(); } catch { /* noop */ }
      }, 150);
      setTimeout(() => {
        try { window.focus(); } catch { /* noop */ }
      }, 600);
    } catch (error) {
      setState((current) => ({ ...current, error: userFacingError(error) }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setApi(null);
    setDustBalance(0n);
    setState({ isConnected: false, address: null, unshieldedAddress: null, networkId: null, error: null });
  }, []);

  const signAndSubmit = useCallback(async (tx: unknown): Promise<void> => {
    if (!api) throw new Error("Wallet not connected");
    const txHex = typeof tx === "string"
      ? tx
      : (() => {
          const serialized = (tx as { serialize?: () => Uint8Array }).serialize?.();
          if (!serialized) throw new Error("Cannot serialize transaction");
          return uint8ArrayToHex(serialized);
        })();

    try {
      const balanced = await api.balanceUnsealedTransaction(txHex, { payFees: true });
      await api.submitTransaction(balanced.tx);
      // Lace resolves on this same /app page. Request focus back from the
      // extension popup without changing the user's route.
      window.focus();
    } catch (error) {
      const message = userFacingError(error);
      if (/Insufficient Funds|InsufficientFunds|could not balance dust/.test(message)) {
        throw new Error("Insufficient DUST balance. Wait for DUST generation or fund the wallet before retrying.");
      }
      throw new Error(`Transaction failed: ${message}`);
    }
  }, [api]);

  return (
    <WalletContext.Provider value={{
      state,
      connect,
      disconnect,
      signAndSubmit,
      isCorrectNetwork: state.networkId !== null && EXPECTED_NETWORKS.has(state.networkId),
      api,
      version: api ? "v4" : null,
      dustBalance,
      dustSymbol: "tDUST",
      refreshBalances,
      unshieldedAddress: state.unshieldedAddress,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useLaceWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useLaceWallet must be used within a WalletProvider");
  return {
    ...context.state,
    ...context,
    formatAddress: (address: string) => address.length <= 12 ? address : `${address.slice(0, 6)}...${address.slice(-4)}`,
  };
}
