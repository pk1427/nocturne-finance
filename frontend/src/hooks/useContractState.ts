"use client";

import { useEffect, useState, useCallback } from "react";

type ReserveState = {
  enabled: boolean;
  tokenColor: string;
  totalSupplied: bigint;
  totalBorrowed: bigint;
  supplyIndex: bigint;
  borrowIndex: bigint;
};

type ContractState = {
  tNight: ReserveState;
  tUsdc: ReserveState;
  loading: boolean;
  error: string | null;
};

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

function serializeReserveState(state: Record<string, unknown>): ReserveState {
  return {
    enabled: state.enabled as boolean,
    tokenColor: Array.from(new Uint8Array(state.tokenColor as unknown as ArrayLike<number>)).map(b => b.toString(16).padStart(2, '0')).join(''),
    totalSupplied: state.totalSupplied as bigint,
    totalBorrowed: state.totalBorrowed as bigint,
    supplyIndex: state.supplyIndex as bigint,
    borrowIndex: state.borrowIndex as bigint,
  };
}

export function useContractState() {
  const [state, setState] = useState<ContractState>({
    tNight: { enabled: false, tokenColor: '', totalSupplied: 0n, totalBorrowed: 0n, supplyIndex: 0n, borrowIndex: 0n },
    tUsdc: { enabled: false, tokenColor: '', totalSupplied: 0n, totalBorrowed: 0n, supplyIndex: 0n, borrowIndex: 0n },
    loading: false,
    error: null,
  });

  const fetchContractState = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const response = await fetch(INDEXER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: LEDGER_QUERY,
          variables: { address: CONTRACT_ADDRESS },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message || "Failed to fetch contract state");
      }

      const action = result.data?.contractAction;
      if (!action) {
        setState((s) => ({ ...s, loading: false, error: `Contract ${CONTRACT_ADDRESS} not found on indexer.` }));
        return;
      }

      const publicState = action.state || action.zswapState || "";
      if (!publicState || typeof publicState !== "string") {
        setState((s) => ({ ...s, loading: false, error: "Contract state is empty or not a string" }));
        return;
      }

      if (publicState.replace(/^0x/, "").length === 0) {
        setState((s) => ({ ...s, loading: false, error: "Contract state is empty" }));
        return;
      }

      try {
        const [{ ContractState: CompactContractState }, NocturneLendingMulti] = await Promise.all([
          import("@midnight-ntwrk/compact-runtime"),
          import("@/lib/contracts/nocturne_lending_multi/contract/index.js"),
        ]);
        const contractState = CompactContractState.deserialize(hexToBytes(publicState));
        const ledger = NocturneLendingMulti.ledger(contractState.data);

        setState({
          tNight: serializeReserveState(ledger.tNightReserve as unknown as Record<string, unknown>),
          tUsdc: serializeReserveState(ledger.tUsdcReserve as unknown as Record<string, unknown>),
          loading: false,
          error: null,
        });
      } catch (e) {
        console.error("Failed to deserialize ContractState:", e);
        setState((s) => ({
          ...s,
          loading: false,
          error: `Failed to parse contract state: ${e instanceof Error ? e.message : "unknown error"}`,
        }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch contract state",
      }));
    }
  }, []);

  useEffect(() => {
    fetchContractState();
    const interval = setInterval(fetchContractState, 10000);
    return () => clearInterval(interval);
  }, [fetchContractState]);

  return {
    ...state,
    refetch: fetchContractState,
  };
}
