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
      <div className="flex items-center gap-2">
        <div className="hidden flex-col items-end sm:flex">
          <span className="font-mono-ui text-xs text-cyan-200">{formatAddress(address!)}</span>
          <span className="font-mono-ui text-[10px] uppercase tracking-wider text-slate-500">{isCorrectNetwork ? networkId : "Wrong network"}</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
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
        className="gradient-border rounded-full px-4 py-2 text-xs font-medium text-cyan-100 transition hover:text-white"
      >
        Connect Wallet
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
