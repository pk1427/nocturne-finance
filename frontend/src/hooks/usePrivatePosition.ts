"use client";

import { useCallback, useEffect, useState } from "react";

export type PrivatePosition = {
  userSupplied: bigint;
  userBorrowed: bigint;
  userLastSupplyIndex: bigint;
  userLastBorrowIndex: bigint;
};

export function usePrivatePosition(accountId: string | null) {
  const [position, setPosition] = useState<PrivatePosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!accountId) {
      setPosition(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contract/position?accountId=${encodeURIComponent(accountId)}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load private position");
      setPosition(data.position ? {
        userSupplied: BigInt(data.position.userSupplied),
        userBorrowed: BigInt(data.position.userBorrowed),
        userLastSupplyIndex: BigInt(data.position.userLastSupplyIndex),
        userLastBorrowIndex: BigInt(data.position.userLastBorrowIndex),
      } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load private position");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refetch]);

  return { position, loading, error, refetch };
}
