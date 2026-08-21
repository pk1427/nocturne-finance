"use client";

import { useContractState } from "@/hooks/useContractState";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "https://indexer.preview.midnight.network/api/v4/graphql";

const LEDGER_QUERY = `
query GetContractState($address: HexEncoded!) {
  contractAction(address: $address) {
    address
    state
    zswapState
    transaction {
      hash
    }
  }
}
`;

function hexToBytes(value: string): Uint8Array {
  const hex = value.replace(/^0x/, "");
  if (hex.length % 2 !== 0) throw new Error("Contract state is not valid hexadecimal");
  return Uint8Array.from({ length: hex.length / 2 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

function serializeReserveState(state: Record<string, unknown>): { enabled: boolean; tokenColor: string; totalSupplied: bigint; totalBorrowed: bigint; supplyIndex: bigint; borrowIndex: bigint } {
  return {
    enabled: state.enabled as boolean,
    tokenColor: Array.from(new Uint8Array(state.tokenColor as unknown as ArrayLike<number>)).map(b => b.toString(16).padStart(2, "0")).join(""),
    totalSupplied: state.totalSupplied as bigint,
    totalBorrowed: state.totalBorrowed as bigint,
    supplyIndex: state.supplyIndex as bigint,
    borrowIndex: state.borrowIndex as bigint,
  };
}

const TNIGHT_PRICE = 1.00;
const TUSDC_PRICE = 1.00;

const formatUnits = (value: bigint, decimals = 6) => `${(value / 10n ** BigInt(decimals)).toLocaleString()}.${(value % 10n ** BigInt(decimals)).toString().padStart(decimals, "0")}`;
const formatUSD = (value: bigint, price: number, decimals = 6) => {
  const num = Number(value) / 10 ** decimals;
  return `$${(num * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

type ReserveRow = {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  totalSupplied: bigint;
  totalBorrowed: bigint;
  enabled: boolean;
  supplyApy: string;
  borrowApy: string;
};

export default function MarketsPage() {
  const { tNight: tNightState, tUsdc: tUsdcState, loading, error } = useContractState();

  const reserves: ReserveRow[] = [
    {
      symbol: "tNIGHT",
      name: "Nocturne Reserve",
      icon: "N",
      color: "cyan",
      totalSupplied: tNightState.totalSupplied,
      totalBorrowed: tNightState.totalBorrowed,
      enabled: tNightState.enabled,
      supplyApy: "0.00%",
      borrowApy: "0.00%",
    },
    {
      symbol: "tUSDC",
      name: "USD Coin Reserve",
      icon: "U",
      color: "blue",
      totalSupplied: tUsdcState.totalSupplied,
      totalBorrowed: tUsdcState.totalBorrowed,
      enabled: tUsdcState.enabled,
      supplyApy: "0.00%",
      borrowApy: "0.00%",
    },
  ];

  const tvl = reserves.reduce((sum, r) => sum + r.totalSupplied, 0n);
  const totalBorrowed = reserves.reduce((sum, r) => sum + r.totalBorrowed, 0n);
  const activeAssets = reserves.filter((r) => r.enabled).length;

  return (
    <main className="nocturne-shell px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-6xl pt-7">
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Preview · Unified market telemetry</p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Markets</h1>
            <p className="mt-2 text-sm text-slate-400">Aggregate reserve analytics for the Nocturne fixed-rate lending protocol.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Operational
          </div>
        </header>

        {(error) && <div className="mb-6 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="glass-panel rounded-2xl p-5">
            <p className="font-mono-ui text-[10px] uppercase tracking-widest text-slate-500">Total Value Locked</p>
            <p className="font-display mt-3 text-3xl font-semibold tracking-tight text-white">{formatUSD(tvl, 1.00)}</p>
            <p className="mt-1 text-xs text-slate-500">{formatUnits(tvl)} units across {activeAssets} assets</p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="font-mono-ui text-[10px] uppercase tracking-widest text-slate-500">Total Borrowed</p>
            <p className="font-display mt-3 text-3xl font-semibold tracking-tight text-indigo-200">{formatUSD(totalBorrowed, 1.00)}</p>
            <p className="mt-1 text-xs text-slate-500">{formatUnits(totalBorrowed)} units borrowed</p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="font-mono-ui text-[10px] uppercase tracking-widest text-slate-500">Total Assets</p>
            <p className="font-display mt-3 text-3xl font-semibold tracking-tight text-cyan-200">{reserves.length}</p>
            <p className="mt-1 text-xs text-slate-500">{activeAssets} active reserves</p>
          </div>
        </section>

        <section className="glass-panel mt-7 overflow-hidden rounded-3xl">
          <div className="border-b border-white/10 bg-white/[0.025] px-5 py-4 sm:px-8">
            <p className="eyebrow">Reserve details</p>
            <h2 className="font-display mt-1 text-xl font-semibold">Nocturne fixed reserves</h2>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-5 border-b border-white/5 px-5 py-4 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:px-8">
                <span>Asset</span>
                <span>Total Supplied</span>
                <span>Total Borrowed</span>
                <span>Available</span>
                <span>Vault Balance</span>
                <span>Supply APY</span>
                <span>Borrow APY</span>
              </div>
              {reserves.map((reserve) => (
                <div key={reserve.symbol} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-5 px-5 py-6 sm:px-8 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`font-display flex h-10 w-10 items-center justify-center rounded-xl border border-${reserve.color}-300/20 bg-${reserve.color}-400/10 text-lg text-${reserve.color}-200`}>{reserve.icon}</span>
                    <div>
                      <p className="font-display font-semibold text-white">{reserve.name}</p>
                      <p className="font-mono-ui mt-1 text-[10px] text-slate-500">{reserve.symbol} · FIXED · PREVIEW</p>
                    </div>
                  </div>
                  <PositionCell value={formatUnits(reserve.totalSupplied)} color="text-cyan-200" label={`${formatUSD(reserve.totalSupplied, reserve.symbol === "tNIGHT" ? TNIGHT_PRICE : TUSDC_PRICE)}`} />
                  <PositionCell value={formatUnits(reserve.totalBorrowed)} color="text-indigo-200" label={`${formatUSD(reserve.totalBorrowed, reserve.symbol === "tNIGHT" ? TNIGHT_PRICE : TUSDC_PRICE)}`} />
                  <PositionCell value={formatUnits(reserve.totalSupplied - reserve.totalBorrowed)} color="text-emerald-200" label="Available liquidity" />
                  <PositionCell value="0.00" color="text-slate-400" label="No external vault" />
                  <PositionCell value={reserve.supplyApy} color="text-cyan-200" label="Fixed rate" />
                  <PositionCell value={reserve.borrowApy} color="text-indigo-200" label="Fixed rate" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-panel mt-7 rounded-3xl p-6">
          <p className="eyebrow">Privacy guarantee</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            All market metrics above represent aggregate pool data. Individual position sizes, health factors, and liquidation thresholds are entirely shielded via zero-knowledge proofs on the Midnight network. Solvency is mathematically proven without data exposure.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Network: preview · Midnight Network
          </div>
        </section>
      </div>
    </main>
  );
}

function PositionCell({ value, color, label }: { value: string; color: string; label?: string }) {
  return (
    <div>
      <p className={`font-mono-ui text-xl ${color}`}>{value}</p>
      {label && <p className="mt-1 text-xs text-slate-500">{label}</p>}
    </div>
  );
}
