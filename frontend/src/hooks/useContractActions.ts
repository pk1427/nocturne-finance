"use client";

import { useState, useCallback } from "react";

type ActionState = {
  loading: boolean;
  error: string | null;
  txHash: string | null;
};

const INITIAL_STATE: ActionState = {
  loading: false,
  error: null,
  txHash: null,
};

export function useContractActions(onSuccess?: () => void) {
  const [depositState, setDepositState] = useState<ActionState>(INITIAL_STATE);
  const [withdrawState, setWithdrawState] = useState<ActionState>(INITIAL_STATE);
  const [borrowState, setBorrowState] = useState<ActionState>(INITIAL_STATE);
  const [repayState, setRepayState] = useState<ActionState>(INITIAL_STATE);

  const executeAction = useCallback(async (action: string, amount: string) => {
    const setState =
      action === "deposit"
        ? setDepositState
        : action === "withdraw"
        ? setWithdrawState
        : action === "borrow"
        ? setBorrowState
        : setRepayState;

    setState({ loading: true, error: null, txHash: null });

    try {
      const response = await fetch("/api/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Transaction failed");
      }

      setState({ loading: false, error: null, txHash: data.txHash });
      onSuccess?.();
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : "Transaction failed",
        txHash: null,
      });
    }
  }, [onSuccess]);

  return {
    deposit: (amount: string) => executeAction("deposit", amount),
    withdraw: (amount: string) => executeAction("withdraw", amount),
    borrow: (amount: string) => executeAction("borrow", amount),
    repay: (amount: string) => executeAction("repay", amount),
    states: {
      deposit: depositState,
      withdraw: withdrawState,
      borrow: borrowState,
      repay: repayState,
    },
  };
}
