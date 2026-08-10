"use client";

import { useEffect, useState, useCallback } from "react";
import { ContractState as CompactContractState } from "@midnight-ntwrk/compact-runtime";

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

function bigintFromBytes(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

function formatUnits(raw: bigint | null): string {
  if (raw === null) return "0";
  return raw.toLocaleString();
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

      const cleaned = publicState.replace(/^0x/, "");
      if (cleaned.length === 0) {
        setState((s) => ({ ...s, loading: false, error: "Contract state is empty" }));
        return;
      }

      const buf = new Uint8Array(Buffer.from(cleaned, "hex"));
      
      try {
        const contractState = CompactContractState.deserialize(buf);
        const stateValue = contractState.data.state;
        
        let totalSupplied: bigint | null = null;
        let totalBorrowed: bigint | null = null;
        let supplyIndex: bigint | null = null;
        let borrowIndex: bigint | null = null;
        let lastAccrualTimestamp: bigint | null = null;

        if (stateValue.type() === "array") {
          const arr = stateValue.asArray();
          if (arr && arr.length >= 5) {
            const cell0 = arr[0].asCell();
            const cell1 = arr[1].asCell();
            const cell2 = arr[2].asCell();
            const cell3 = arr[3].asCell();
            const cell4 = arr[4].asCell();

            if (cell0) totalSupplied = bigintFromBytes(cell0.value[0]);
            if (cell1) totalBorrowed = bigintFromBytes(cell1.value[0]);
            if (cell2) supplyIndex = bigintFromBytes(cell2.value[0]);
            if (cell3) borrowIndex = bigintFromBytes(cell3.value[0]);
            if (cell4) lastAccrualTimestamp = bigintFromBytes(cell4.value[0]);
          }
        }

        setState({
          totalSupplied,
          totalBorrowed,
          supplyIndex,
          borrowIndex,
          lastAccrualTimestamp,
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
    formatUnits,
  };
}
