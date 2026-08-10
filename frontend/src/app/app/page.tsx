"use client";

import { useEffect, useState } from "react";

export default function AppPage() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    // Placeholder for Lace wallet integration
    // Check if Lace wallet is available and connected
    const checkWallet = async () => {
      if (typeof window !== "undefined" && (window as any).lace) {
        try {
          const api = await (window as any).lace.enable();
          const addr = await api.getAddress();
          setAddress(addr);
          setConnected(true);
        } catch {
          // Not connected
        }
      }
    };
    checkWallet();
  }, []);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).lace) {
      try {
        const api = await (window as any).lace.enable();
        const addr = await api.getAddress();
        setAddress(addr);
        setConnected(true);
      } catch (err) {
        console.error("Failed to connect Lace wallet:", err);
      }
    } else {
      alert("Lace wallet not detected. Please install it to continue.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold">Nocturne Finance</h1>
        <p className="text-gray-400">
          Supply, borrow, and earn interest with privacy on Midnight.
        </p>

        {connected ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 space-y-2">
            <p className="text-green-400 font-mono text-sm break-all">
              {address}
            </p>
            <p className="text-gray-500 text-sm">
              Wallet connected. Contract integration coming soon.
            </p>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 transition"
          >
            Connect Lace Wallet
          </button>
        )}
      </div>
    </main>
  );
}
