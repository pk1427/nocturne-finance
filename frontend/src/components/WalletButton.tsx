"use client";

import { useLaceWallet } from "@/hooks/useLaceWallet";

export function WalletButton() {
  const { isConnected, address, networkId, error, connect, disconnect, isCorrectNetwork } = useLaceWallet();

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-mono text-indigo-400">{formatAddress(address!)}</span>
          <span className="text-xs text-gray-500">{isCorrectNetwork ? networkId : "Wrong network"}</span>
        </div>
        <button
          onClick={handleDisconnect}
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
        onClick={handleConnect}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition"
      >
        Connect Wallet
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
