"use client";

import { useLaceWallet } from "@/hooks/useLaceWallet";

export default function AppPage() {
  const { isConnected, address, connect, error, isCorrectNetwork } = useLaceWallet();

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
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <p className="text-gray-400 text-sm font-mono">
                  {address}
                </p>
              </div>
              {!isCorrectNetwork && (
                <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-2">
                  <p className="text-red-400 text-sm">
                    Please switch to the preview network in Lace wallet
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Total Supplied</p>
                <p className="text-2xl font-bold mt-2">0.00</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Total Borrowed</p>
                <p className="text-2xl font-bold mt-2">0.00</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Net APY</p>
                <p className="text-2xl font-bold mt-2">0.00%</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400 text-sm mb-4">
                Contract integration pending. Deploy the contract on preview and
                set NEXT_PUBLIC_CONTRACT_ADDRESS.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
