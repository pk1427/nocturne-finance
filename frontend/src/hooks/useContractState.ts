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
const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || "http://127.0.0.1:8088/api/v4/graphql";

const LEDGER_QUERY = `
query GetContractLedger($contractAddress: ContractAddress!) {
  zswapState {
    contractStates(contractAddress: $contractAddress) {
      publicValue
      privateValue
    }
  }
}
`;

function decodeCompactValue(hex: string | null): bigint | null {
  if (!hex) return null;
  try {
    const cleaned = hex.replace(/^0x/, "");
    if (cleaned.length === 0) return BigInt(0);
    const padded = cleaned.padStart(32, "0");
    const bytes = new Uint8Array(padded.match(/.{2}/g)?.map((b) => parseInt(b, 16)) || []);
    let value = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
      value = (value << BigInt(8)) | BigInt(bytes[i]);
    }
    return value;
  } catch {
    return null;
  }
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
          variables: { contractAddress: CONTRACT_ADDRESS },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message || "Failed to fetch contract state");
      }

      const contractStates = result.data?.zswapState?.contractStates || [];
      
      if (contractStates.length === 0) {
        setState((s) => ({ ...s, loading: false, error: "Contract not found or not deployed" }));
        return;
      }

      const publicState = contractStates[0]?.publicValue || "";
      
      setState({
        totalSupplied: decodeCompactValue(publicState.slice(0, 64)),
        totalBorrowed: decodeCompactValue(publicState.slice(64, 128)),
        supplyIndex: decodeCompactValue(publicState.slice(128, 192)),
        borrowIndex: decodeCompactValue(publicState.slice(192, 256)),
        lastAccrualTimestamp: decodeCompactValue(publicState.slice(256, 320)),
        loading: false,
        error: null,
      });
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

  return { ...state, refetch: fetchContractState };
}
