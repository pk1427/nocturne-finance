"use client";

import { useEffect, useState, useCallback } from "react";

type ContractState = {
  totalSupplied: bigint | null;
  totalBorrowed: bigint | null;
  supplyIndex: bigint | null;
  borrowIndex: bigint | null;
  lastAccrualTimestamp: bigint | null;
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

export function useContractState() {
  const [state, setState] = useState<ContractState>({
    totalSupplied: null,
    totalBorrowed: null,
    supplyIndex: null,
    borrowIndex: null,
    lastAccrualTimestamp: null,
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
        // Compact's StateValue encoding is not a positional array of ledger
        // cells. Decode it through the generated contract, so additions to
        // the ledger layout cannot silently shift the displayed values.
        const [{ ContractState: CompactContractState }, NocturneLending] = await Promise.all([
          import("@midnight-ntwrk/compact-runtime"),
          import("@/lib/contracts/nocturne_lending/contract/index.js"),
        ]);
        const contractState = CompactContractState.deserialize(hexToBytes(publicState));
        const ledger = NocturneLending.ledger(contractState.data);

        setState({
          totalSupplied: ledger.totalSupplied,
          totalBorrowed: ledger.totalBorrowed,
          supplyIndex: ledger.supplyIndex,
          borrowIndex: ledger.borrowIndex,
          lastAccrualTimestamp: ledger.lastAccrualTimestamp,
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
