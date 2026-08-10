"use client";

import { useState } from "react";

type TransactionPreviewProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  details: { label: string; value: string }[];
};

export function TransactionPreview({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  details,
}: TransactionPreviewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold mb-1">Review Transaction</h3>
        <p className="text-gray-400 text-sm mb-4">
          Please review the details before confirming. This will be sent to the proof server for ZK proof generation.
        </p>

        <div className="space-y-2 mb-6">
          {details.map((detail) => (
            <div key={detail.label} className="flex justify-between text-sm">
              <span className="text-gray-400">{detail.label}</span>
              <span className="text-white font-mono text-right max-w-[60%] break-all">{detail.value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 mb-6">
          <p className="text-yellow-400 text-xs">
            ⚠️ This is a server-assisted flow. The transaction will be proven server-side and signed with the backend wallet.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm & Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}
