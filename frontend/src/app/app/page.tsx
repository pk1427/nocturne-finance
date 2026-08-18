"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TransactionPreview } from "@/components/TransactionPreview";
import { useContractActions } from "@/hooks/useContractActions";
import { useContractState } from "@/hooks/useContractState";
import { useLaceWallet } from "@/hooks/useLaceWallet";
import { usePrivatePosition } from "@/hooks/usePrivatePosition";

type Action = "deposit" | "withdraw" | "borrow" | "repay";

const ACTION_COPY: Record<Action, { tab: string; title: string; description: string; after: string; accent: string }> = {
  deposit: { tab: "Supply", title: "Supply reserve units", description: "Increase your confidential supplied position.", after: "Supplied after", accent: "from-cyan-400 to-sky-400" },
  withdraw: { tab: "Withdraw", title: "Withdraw reserve units", description: "Reduce your confidential supplied position.", after: "Supplied after", accent: "from-sky-400 to-indigo-400" },
  borrow: { tab: "Borrow", title: "Borrow reserve units", description: "Increase your confidential borrowed position.", after: "Borrowed after", accent: "from-indigo-400 to-violet-400" },
  repay: { tab: "Repay", title: "Repay reserve units", description: "Reduce your confidential borrowed position.", after: "Borrowed after", accent: "from-emerald-400 to-cyan-400" },
};

const EXPLORER_CONTRACT_URL = process.env.NEXT_PUBLIC_EXPLORER_URL;
const formatValue = (value: bigint | null) => value === null ? "—" : `${(value / 1_000_000n).toLocaleString()}.${(value % 1_000_000n).toString().padStart(6, "0")}`;
const formatDust = (raw: bigint) => `${(raw / 1_000_000_000_000_000n).toLocaleString()}.${(raw % 1_000_000_000_000_000n).toString().padStart(15, "0").slice(0, 6)}`;

export default function AppPage() {
  const { isConnected, address, networkId, error: walletError, dustBalance, dustSymbol, refreshBalances } = useLaceWallet();
  const contract = useContractState();
  const privatePosition = usePrivatePosition(address);
  const actions = useContractActions(address, () => void Promise.all([privatePosition.refetch(), refreshBalances(), contract.refetch()]));
  const [action, setAction] = useState<Action>("deposit");
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAccountId, setReviewAccountId] = useState<string | null>(null);

  useEffect(() => { if (isConnected) void refreshBalances(); }, [isConnected, refreshBalances]);

  const selectedState = actions.states[action];
  const supplied = privatePosition.position?.userSupplied ?? null;
  const borrowed = privatePosition.position?.userBorrowed ?? null;
  const positionLimit = action === "withdraw" ? supplied : action === "repay" ? borrowed : null;
  const amountValue = /^\d+(\.\d{1,6})?$/.test(amount) ? (() => { const [whole, fraction = ""] = amount.split("."); return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0") || "0"); })() : 0n;
  const nextValue = action === "deposit" ? (supplied ?? 0n) + amountValue
    : action === "withdraw" ? (supplied ?? 0n) - amountValue
      : action === "borrow" ? (borrowed ?? 0n) + amountValue
        : (borrowed ?? 0n) - amountValue;
  const canSubmit = useMemo(() => isConnected && !selectedState.loading, [isConnected, selectedState.loading]);

  function validate() {
    if (!/^\d+(\.\d{1,6})?$/.test(amount) || amountValue <= 0n) { setValidationError("Enter a positive tNight amount (up to 6 decimals)."); return false; }
    if ((action === "withdraw" || action === "repay") && positionLimit === null) { setValidationError("Your private position has not been loaded yet."); return false; }
    if (positionLimit !== null && amountValue > positionLimit) { setValidationError(`Amount exceeds your recorded ${action === "withdraw" ? "supplied" : "borrowed"} position.`); return false; }
    setValidationError(null); return true;
  }

  function openReview(event: FormEvent) { event.preventDefault(); if (validate()) { setReviewAccountId(address); setReviewOpen(true); } }
  async function confirmAction() { try { await actions[action](amount); setReviewOpen(false); setReviewAccountId(null); setAmount(""); } catch { /* surfaced beside the form */ } }

  if (!isConnected) return <DisconnectedView error={walletError} />;

  return (
    <main className="nocturne-shell px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-6xl pt-7">
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end">
          <div><p className="eyebrow">Shielded overview · {networkId ?? "Preview"}</p><h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Private dashboard</h1><p className="mt-2 text-sm text-slate-400">Only this wallet&apos;s private lending position is displayed below.</p></div>
          <button onClick={() => void Promise.all([privatePosition.refetch(), refreshBalances()])} className="glass-panel font-mono-ui inline-flex items-center gap-2 self-start rounded-xl px-4 py-3 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100 md:self-auto"><span className="h-2 w-2 rounded-full bg-cyan-300" /> REFRESH ACCOUNT</button>
        </header>

        {(walletError || privatePosition.error) && <div className="mb-6 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{walletError || privatePosition.error}</div>}

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Your supplied" value={formatValue(supplied)} detail="Confidential protocol units" color="text-cyan-200" />
          <Metric label="Your borrowed" value={formatValue(borrowed)} detail="Confidential protocol units" color="text-indigo-200" />
          <Metric label={`Your ${dustSymbol}`} value={formatDust(dustBalance)} detail="Spendable network fee resource" color="text-emerald-200" />
        </section>

        <section className="glass-panel mt-7 overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.025] px-5 py-4 sm:px-8"><div><p className="eyebrow">Your lending position</p><h2 className="font-display mt-1 text-xl font-semibold">Nocturne fixed reserve</h2></div><span className="font-mono-ui rounded-full border border-cyan-300/20 bg-cyan-400/5 px-3 py-1.5 text-[10px] tracking-widest text-cyan-100">PRIVATE STATE</span></div>
          <div className="overflow-x-auto"><div className="min-w-[660px]"><div className="grid grid-cols-[1.25fr_1fr_1fr_.8fr] gap-5 border-b border-white/5 px-5 py-4 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:px-8"><span>Reserve</span><span>Supplied</span><span>Borrowed</span><span>Manage</span></div><div className="grid grid-cols-[1.25fr_1fr_1fr_.8fr] items-center gap-5 px-5 py-6 sm:px-8"><div className="flex items-center gap-3"><span className="font-display flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-lg text-cyan-200">N</span><div><p className="font-display font-semibold text-white">Nocturne Reserve</p><p className="font-mono-ui mt-1 text-[10px] text-slate-500">FIXED VALUE · PREVIEW</p></div></div><PositionCell value={formatValue(supplied)} color="text-cyan-200" label="Your supplied"/><PositionCell value={formatValue(borrowed)} color="text-indigo-200" label="Your borrowed"/><button onClick={() => document.getElementById("manage-position")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="w-fit rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100">Manage</button></div></div></div>
        </section>

        <section id="manage-position" className="glass-panel mt-7 rounded-3xl p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end"><div><p className="eyebrow">Manage position</p><h2 className="font-display mt-2 text-2xl font-semibold">{ACTION_COPY[action].title}</h2><p className="mt-1 text-sm text-slate-400">{ACTION_COPY[action].description}</p></div><span className="font-mono-ui text-xs text-slate-500">PROVE → LACE → COMMIT</span></div>
          <div className="mt-6 grid gap-7 lg:grid-cols-[1.12fr_.88fr]">
            <form onSubmit={openReview}>
              <div className="grid grid-cols-4 rounded-xl border border-white/10 bg-white/[0.025] p-1">{(Object.keys(ACTION_COPY) as Action[]).map((candidate) => <button key={candidate} type="button" onClick={() => { setAction(candidate); setValidationError(null); }} className={`rounded-lg px-2 py-3 text-center text-sm font-semibold transition ${action === candidate ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>{ACTION_COPY[candidate].tab}</button>)}</div>
              <div className="mt-7 flex items-end justify-between gap-4"><label className="font-display text-lg font-semibold">Amount to {ACTION_COPY[action].tab.toLowerCase()}</label><span className="font-mono-ui text-xs text-slate-500">{action === "withdraw" ? `Supplied: ${formatValue(supplied)}` : action === "repay" ? `Borrowed: ${formatValue(borrowed)}` : "tNight balance"}</span></div>
              <div className="mt-3 flex overflow-hidden rounded-2xl border border-white/15 bg-[#050b14] focus-within:border-cyan-300/50"><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.000000" className="min-w-0 flex-1 bg-transparent px-5 py-5 font-mono-ui text-3xl text-white outline-none placeholder:text-slate-700"/><span className="flex items-center border-l border-white/15 px-5 font-mono-ui text-xs text-slate-400">tNIGHT</span></div>
              <div className="mt-4 grid grid-cols-4 gap-3">{[25, 50, 75, 100].map((percent) => <button key={percent} type="button" onClick={() => { if (positionLimit !== null) setAmount(((positionLimit * BigInt(percent)) / 100n).toString()); }} disabled={positionLimit === null} className="rounded-xl border border-white/10 py-3 font-mono-ui text-xs text-slate-400 transition hover:border-cyan-300/25 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">{percent}%</button>)}</div>
              <button type="submit" disabled={!canSubmit} className={`mt-7 w-full rounded-2xl bg-gradient-to-r ${ACTION_COPY[action].accent} px-6 py-4 font-display text-lg font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`}>{selectedState.loading ? "Processing…" : `${ACTION_COPY[action].tab} Nocturne Reserve`}</button>
              {(validationError || selectedState.error) && <p className="mt-4 text-sm text-rose-300">{validationError || selectedState.error}</p>}
              {selectedState.submitted && <p className="mt-4 text-sm text-emerald-200">Submitted to Lace. {EXPLORER_CONTRACT_URL && <a href={EXPLORER_CONTRACT_URL} target="_blank" rel="noreferrer" className="ml-1 text-cyan-200 underline underline-offset-4 hover:text-cyan-100">View contract on Explorer</a>}</p>}
            </form>
            <aside className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"><p className="eyebrow">Transaction overview</p><div className="mt-7 space-y-7"><OverviewMetric label={ACTION_COPY[action].after} value={formatValue(nextValue < 0n ? 0n : nextValue)} /><OverviewMetric label="Current supplied" value={formatValue(supplied)} /><OverviewMetric label="Current borrowed" value={formatValue(borrowed)} /><div className="border-t border-white/10 pt-5"><p className="font-mono-ui text-[10px] uppercase tracking-widest text-slate-500">Network fee balance</p><p className="font-display mt-2 text-xl text-emerald-200">{formatDust(dustBalance)} {dustSymbol}</p></div></div></aside>
          </div>
        </section>
      </div>
      <TransactionPreview isOpen={reviewOpen && reviewAccountId === address} onClose={() => { setReviewOpen(false); setReviewAccountId(null); }} onConfirm={() => void confirmAction()} loading={selectedState.loading} details={[{ label: "Action", value: ACTION_COPY[action].tab }, { label: "Amount", value: amount || "—" }, { label: "Network", value: networkId || "Preview" }, { label: "Contract", value: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "Not configured" }]} />
    </main>
  );
}

function DisconnectedView({ error }: { error: string | null }) { return <main className="nocturne-shell flex min-h-[calc(100vh-6rem)] items-center justify-center px-5"><section className="glass-panel max-w-xl rounded-3xl p-8 text-center sm:p-12"><p className="eyebrow">Midnight Preview</p><h1 className="font-display mt-4 text-4xl font-bold">Enter the private reserve.</h1><p className="mt-5 leading-relaxed text-slate-400">Connect your Lace wallet from the navigation to load your confidential position and submit real Preview transactions.</p><p className="font-mono-ui mt-7 rounded-xl border border-cyan-300/15 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-100/80">PROOF-GENERATED · LACE-SIGNED · PREVIEW-SETTLED</p>{error && <p className="mt-5 text-sm text-rose-300">{error}</p>}</section></main>; }
function Metric({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) { return <article className="glass-panel rounded-2xl p-5"><p className="font-mono-ui text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className={`font-display mt-3 text-3xl font-semibold tracking-tight ${color}`}>{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></article>; }
function PositionCell({ value, color, label }: { value: string; color: string; label: string }) { return <div><p className={`font-mono-ui text-xl ${color}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>; }
function OverviewMetric({ label, value }: { label: string; value: string }) { return <div><p className="font-mono-ui text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="font-display mt-2 text-2xl text-white">{value} <span className="text-sm text-slate-500">units</span></p></div>; }
