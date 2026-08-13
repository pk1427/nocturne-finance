"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TransactionPreview } from "@/components/TransactionPreview";
import { useContractActions } from "@/hooks/useContractActions";
import { useContractState } from "@/hooks/useContractState";
import { useLaceWallet } from "@/hooks/useLaceWallet";
import { usePrivatePosition } from "@/hooks/usePrivatePosition";

type Action = "deposit" | "withdraw" | "borrow" | "repay";

const ACTION_COPY: Record<Action, { title: string; description: string; tone: string }> = {
  deposit: { title: "Deposit", description: "Add to your confidential supplied position.", tone: "bg-emerald-600 hover:bg-emerald-500" },
  withdraw: { title: "Withdraw", description: "Reduce your supplied position.", tone: "bg-sky-600 hover:bg-sky-500" },
  borrow: { title: "Borrow", description: "Add to your confidential borrowed position.", tone: "bg-violet-600 hover:bg-violet-500" },
  repay: { title: "Repay", description: "Reduce your borrowed position.", tone: "bg-amber-600 hover:bg-amber-500" },
};

const EXPLORER_CONTRACT_URL = process.env.NEXT_PUBLIC_EXPLORER_URL;

function display(value: bigint | null) {
  return value === null ? "—" : value.toLocaleString();
}

function formatDust(raw: bigint) {
  const unit = 1_000_000_000_000_000n;
  const whole = raw / unit;
  const fraction = (raw % unit).toString().padStart(15, "0").slice(0, 6);
  return `${whole.toLocaleString()}.${fraction}`;
}

export default function AppPage() {
  const { isConnected, address, networkId, error: walletError, dustBalance, dustSymbol, refreshBalances } = useLaceWallet();
  const contract = useContractState();
  const privatePosition = usePrivatePosition(address);
  const actions = useContractActions(address, () => {
    void Promise.all([contract.refetch(), privatePosition.refetch(), refreshBalances()]);
  });
  const [action, setAction] = useState<Action>("deposit");
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAccountId, setReviewAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) void refreshBalances();
  }, [isConnected, refreshBalances]);

  const selectedState = actions.states[action];
  const positionLimit = action === "withdraw"
    ? privatePosition.position?.userSupplied ?? null
    : action === "repay"
      ? privatePosition.position?.userBorrowed ?? null
      : null;

  const canSubmit = useMemo(() => isConnected && contract.totalSupplied !== null && !selectedState.loading, [isConnected, contract.totalSupplied, selectedState.loading]);

  function validate(): boolean {
    if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) {
      setValidationError("Enter a positive whole-number amount in protocol units.");
      return false;
    }
    const parsed = BigInt(amount);
    if ((action === "withdraw" || action === "repay") && positionLimit === null) {
      setValidationError("Your private position has not been loaded yet.");
      return false;
    }
    if (positionLimit !== null && parsed > positionLimit) {
      setValidationError(`Amount exceeds your recorded ${action === "withdraw" ? "supplied" : "borrowed"} position.`);
      return false;
    }
    setValidationError(null);
    return true;
  }

  function openReview(event: FormEvent) {
    event.preventDefault();
    if (validate()) {
      setReviewAccountId(address);
      setReviewOpen(true);
    }
  }

  async function confirmAction() {
    try {
      await actions[action](amount);
      setReviewOpen(false);
      setReviewAccountId(null);
      setAmount("");
    } catch {
      // The hook renders the actionable error next to the form.
    }
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
          <p className="text-sm font-medium text-indigo-300">Midnight Preview</p>
          <h1 className="text-4xl font-bold">Nocturne Finance</h1>
          <p className="text-lg text-gray-400">A fixed-value, privacy-preserving lending demo. Connect Lace to prepare a real proof and signing flow.</p>
          <p className="rounded-lg border border-gray-700 px-5 py-3 text-sm text-gray-300">Use the Connect Wallet button in the header to continue.</p>
          {walletError && <span className="text-sm text-red-400">{walletError}</span>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-300">Midnight Preview · fixed reserve MVP</p>
            <h1 className="mt-1 text-3xl font-bold">Nocturne Finance</h1>
            <p className="mt-1 text-sm text-gray-500">Four-action lending loop on Midnight Preview.</p>
          </div>
        </div>

        {(walletError || contract.error || privatePosition.error) && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {walletError || contract.error || privatePosition.error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Stat label="Pool supplied" value={display(contract.totalSupplied)} detail="Protocol units" />
          <Stat label="Pool borrowed" value={display(contract.totalBorrowed)} detail="Protocol units" />
          <Stat label={`Wallet ${dustSymbol}`} value={formatDust(dustBalance)} detail="Spendable DUST · used by Lace to pay fees" />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Your confidential position</h2>
                <p className="mt-1 text-xs text-gray-500">Read from the proof service’s persisted state for this shielded wallet.</p>
              </div>
              <button onClick={() => void privatePosition.refetch()} className="text-xs text-indigo-300 hover:text-indigo-200">Refresh</button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Stat label="Supplied" value={display(privatePosition.position?.userSupplied ?? null)} />
              <Stat label="Borrowed" value={display(privatePosition.position?.userBorrowed ?? null)} />
            </div>
            {!privatePosition.position && !privatePosition.loading && <p className="mt-4 text-xs text-gray-500">No submitted position yet. Your first deposit starts from the contract’s zero position.</p>}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="font-semibold">Pool configuration</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-300">
              <p>Supply index <span className="float-right font-mono text-white">{display(contract.supplyIndex)}</span></p>
              <p>Borrow index <span className="float-right font-mono text-white">{display(contract.borrowIndex)}</span></p>
            </div>
            <p className="mt-4 text-xs text-gray-500">Public state refreshes every 10 seconds. Interest accrual is outside this fixed-index demo flow.</p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-5"><h2 className="font-semibold">Lending actions</h2><p className="mt-1 text-sm text-gray-500">Each action creates a real server-side proof and then opens Lace for balancing and submission.</p></div>
          <div className="grid gap-2 sm:grid-cols-4">
            {(Object.keys(ACTION_COPY) as Action[]).map((candidate) => (
              <button key={candidate} onClick={() => { setAction(candidate); setValidationError(null); }} className={`rounded-lg border px-4 py-3 text-left transition ${action === candidate ? "border-indigo-400 bg-indigo-950/50" : "border-gray-700 hover:border-gray-500"}`}>
                <span className="block font-medium">{ACTION_COPY[candidate].title}</span><span className="mt-1 block text-xs text-gray-400">{ACTION_COPY[candidate].description}</span>
              </button>
            ))}
          </div>
          <form onSubmit={openReview} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" placeholder="Amount (whole protocol units)" className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-indigo-400" />
            <button type="submit" disabled={!canSubmit} className={`rounded-lg px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_COPY[action].tone}`}>{selectedState.loading ? "Processing…" : `${ACTION_COPY[action].title} with Lace`}</button>
          </form>
          {(validationError || selectedState.error) && <p className="mt-3 text-sm text-red-400">{validationError || selectedState.error}</p>}
          {selectedState.submitted && (
            <p className="mt-3 text-sm text-emerald-400">
              Submitted to Lace. {EXPLORER_CONTRACT_URL && <a href={EXPLORER_CONTRACT_URL} target="_blank" rel="noreferrer" className="ml-1 underline hover:text-emerald-300">View contract on Explorer</a>}
            </p>
          )}
          <p className="mt-3 text-xs text-gray-500">Withdraw and repay are capped by the persisted position shown above. Deposit and borrow are protocol-value operations in this MVP; no wallet token custody is implemented.</p>
        </section>
      </div>

      <TransactionPreview isOpen={reviewOpen && reviewAccountId === address} onClose={() => { setReviewOpen(false); setReviewAccountId(null); }} onConfirm={() => void confirmAction()} loading={selectedState.loading} details={[
        { label: "Action", value: ACTION_COPY[action].title },
        { label: "Amount", value: amount || "—" },
        { label: "Network", value: networkId || "Preview" },
        { label: "Contract", value: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "Not configured" },
      ]} />
    </main>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-lg border border-gray-800 bg-gray-900 p-5"><p className="text-sm text-gray-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p>{detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}</div>;
}
