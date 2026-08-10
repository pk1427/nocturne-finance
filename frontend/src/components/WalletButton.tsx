"use client";

import { useLaceWallet } from "@/hooks/useLaceWallet";

export function WalletButton() {
  const { isConnected, address, connect, disconnect, error, isCorrectNetwork } = useLaceWallet();

  const formatAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-mono text-indigo-400">{formatAddress(address!)}</span>
          {!isCorrectNetwork && (
            <span className="text-xs text-red-400">Wrong network</span>
          )}
        </div>
        <button
          onClick={disconnect}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm hover:border-gray-500 transition"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition"
      >
        Connect Lace
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
