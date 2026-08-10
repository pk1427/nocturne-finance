"use client";

import { useWallet } from "@/hooks/useWallet";

export function WalletButton() {
  const { info, loading, error, refresh } = useWallet();
  const isConnected = !!info?.address;

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async () => {
    await refresh();
  };

  const handleDisconnect = () => {
    // Server-side wallet cannot truly disconnect from the frontend.
    // This is a no-op UI-wise; reload the page if you want to reset.
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-mono text-indigo-400">{formatAddress(info!.address)}</span>
          <span className="text-xs text-gray-500">{info!.network}</span>
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
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
      {!error && !isConnected && (
        <span className="text-xs text-gray-500">
          Uses server-side wallet
        </span>
      )}
    </div>
  );
}
