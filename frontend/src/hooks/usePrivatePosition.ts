"use client";

import { useCallback, useEffect, useState } from "react";

export type PrivatePosition = {
  tNightSupplied: bigint;
  tNightBorrowed: bigint;
  tUsdcSupplied: bigint;
  tUsdcBorrowed: bigint;
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
        tNightSupplied: BigInt(data.position.tNightSupplied),
        tNightBorrowed: BigInt(data.position.tNightBorrowed),
        tUsdcSupplied: BigInt(data.position.tUsdcSupplied),
        tUsdcBorrowed: BigInt(data.position.tUsdcBorrowed),
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
