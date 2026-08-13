"use client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020408]/75 p-4 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <p className="eyebrow">Confirm action</p>
        <h3 className="font-display mt-2 text-xl font-semibold">Review transaction</h3>
        <p className="mb-5 mt-2 text-sm leading-relaxed text-slate-400">
          Please review the details before confirming. This will be sent to the proof server for ZK proof generation.
        </p>

        <div className="mb-6 space-y-2 rounded-xl border border-white/5 bg-black/20 p-4">
          {details.map((detail) => (
            <div key={detail.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{detail.label}</span>
              <span className="font-mono-ui max-w-[60%] break-all text-right text-xs text-white">{detail.value}</span>
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-xl border border-cyan-300/15 bg-cyan-400/5 p-3">
          <p className="text-xs leading-relaxed text-cyan-100/80">
            This call is proven server-side, then balanced and signed by Lace.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm & Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}
