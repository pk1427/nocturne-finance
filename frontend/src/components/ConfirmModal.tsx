"use client";

import { useState } from "react";

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  details: { label: string; value: string }[];
  confirmLabel?: string;
  loading?: boolean;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  details,
  confirmLabel = "Confirm",
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>

        <div className="space-y-2 mb-6">
          {details.map((detail) => (
            <div key={detail.label} className="flex justify-between text-sm">
              <span className="text-gray-400">{detail.label}</span>
              <span className="text-white font-mono">{detail.value}</span>
            </div>
          ))}
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
            {loading ? "Confirming..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
