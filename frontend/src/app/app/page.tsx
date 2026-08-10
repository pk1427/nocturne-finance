"use client";

import { useEffect } from "react";
import { useLaceWallet } from "@/hooks/useLaceWallet";
import { useContractState } from "@/hooks/useContractState";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export default function AppPage() {
  const { isConnected, address, connect, error, isCorrectNetwork } = useLaceWallet();
  const { totalSupplied, totalBorrowed, supplyIndex, borrowIndex, lastAccrualTimestamp, loading, error: contractError, refetch } = useContractState();

  const formatAddress = (addr: string | null) => {
    if (!addr) return "";
    if (addr.length <= 20) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <h1 className="text-4xl font-bold">Nocturne Finance</h1>
            <p className="text-gray-400 text-lg max-w-md text-center">
              Privacy-preserving lending & borrowing on Midnight. Connect your
              Lace wallet to get started.
            </p>
            <button
              onClick={connect}
              className="rounded-lg bg-indigo-600 px-8 py-3 font-semibold hover:bg-indigo-500 transition"
            >
              Connect Lace Wallet
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-gray-500 text-sm">
              Using the{" "}
              <a
                href="https://chromewebstore.google.com/detail/lace-midnight-preview/hgeekaiplokcnmakghbdfbgnlfheichg"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                Lace Midnight Preview
              </a>{" "}
              extension? Make sure it’s unlocked and set to the undeployed/preview network.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <p className="text-gray-400 text-sm font-mono">
                  {formatAddress(address)}
                </p>
              </div>
              {!isCorrectNetwork && (
                <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-2">
                  <p className="text-red-400 text-sm">
                    Please switch to the undeployed/preview/preprod network in Lace wallet
                  </p>
                </div>
              )}
            </div>

            {contractError && (
              <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 px-4 py-3">
                <p className="text-yellow-400 text-sm">{contractError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Total Supplied</p>
                <p className="text-2xl font-bold mt-2">
                  {loading ? "..." : totalSupplied !== null ? totalSupplied.toLocaleString() : "0.00"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Total Borrowed</p>
                <p className="text-2xl font-bold mt-2">
                  {loading ? "..." : totalBorrowed !== null ? totalBorrowed.toLocaleString() : "0.00"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Supply Index</p>
                <p className="text-2xl font-bold mt-2">
                  {loading ? "..." : supplyIndex !== null ? supplyIndex.toLocaleString() : "0.00"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-sm">Pool State</p>
                <button
                  onClick={refetch}
                  disabled={loading}
                  className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Borrow Index</p>
                  <p className="font-mono">{borrowIndex !== null ? borrowIndex.toLocaleString() : "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Accrual</p>
                  <p className="font-mono">{lastAccrualTimestamp !== null ? lastAccrualTimestamp.toLocaleString() : "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400 text-sm mb-2">
                Contract: <span className="font-mono text-xs break-all">{CONTRACT_ADDRESS || "Not configured"}</span>
              </p>
              <p className="text-gray-500 text-xs">
                Reading from local undeployed network
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

