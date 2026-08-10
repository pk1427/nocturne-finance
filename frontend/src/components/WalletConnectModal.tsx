"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";

type WalletConnectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
};

export function WalletConnectModal({ isOpen, onClose, onConnect }: WalletConnectModalProps) {
  const { info, loading, error } = useWallet();

  if (!isOpen) return null;

  const isConnected = !!info?.address;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold mb-1">Connect Wallet</h3>
        <p className="text-gray-400 text-sm mb-4">
          Connect to the Nocturne Finance backend wallet to interact with the lending pool.
        </p>

        {!isConnected ? (
          <>
            <div className="rounded-lg border border-gray-800 bg-gray-800 p-4 mb-4">
              <p className="text-sm text-gray-300 mb-2">
                This dApp uses a server-side wallet for transaction signing.
              </p>
              <p className="text-xs text-gray-500">
                No browser wallet extension is required. Click below to connect to the backend wallet.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 mb-4">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={onConnect}
                disabled={loading}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Connect"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-green-800 bg-green-900/20 p-4 mb-4">
              <p className="text-sm text-green-400 mb-1">Connected</p>
              <p className="text-xs font-mono text-gray-300 break-all">{info.address}</p>
              <p className="text-xs text-gray-500 mt-1">Network: {info.network}</p>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
