"use client";

import { useState, useCallback } from "react";
import { useLaceWallet } from "@/hooks/useLaceWallet";

type Asset = "tNight" | "tUSDC";

type ActionState = {
  loading: boolean;
  error: string | null;
  submitted: boolean;
  accountId: string | null;
};

const INITIAL_STATE: ActionState = {
  loading: false,
  error: null,
  submitted: false,
  accountId: null,
};

export function useContractActions(accountId: string | null, asset: Asset, onSuccess?: () => void) {
  const [depositState, setDepositState] = useState<ActionState>(INITIAL_STATE);
  const [withdrawState, setWithdrawState] = useState<ActionState>(INITIAL_STATE);
  const [borrowState, setBorrowState] = useState<ActionState>(INITIAL_STATE);
  const [repayState, setRepayState] = useState<ActionState>(INITIAL_STATE);

  const { signAndSubmit, isConnected, api, version } = useLaceWallet();

  const executeAction = useCallback(async (action: string, amount: string) => {
    const setState =
      action === "deposit"
        ? setDepositState
        : action === "withdraw"
        ? setWithdrawState
        : action === "borrow"
        ? setBorrowState
        : setRepayState;

    setState({ loading: true, error: null, submitted: false, accountId });

    try {
      if (!accountId || !isConnected || !api || version !== "v4") {
        throw new Error("Lace wallet v4 not connected");
      }

      const shieldedAddresses = await api.getShieldedAddresses();
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      if (shieldedAddresses.shieldedAddress !== accountId) {
        throw new Error("Connected wallet changed. Please retry the action.");
      }

      const proveResponse = await fetch("/api/contract/prove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          asset,
          amount,
          coinPublicKey: shieldedAddresses.shieldedCoinPublicKey,
          encryptionPublicKey: shieldedAddresses.shieldedEncryptionPublicKey,
          accountId: shieldedAddresses.shieldedAddress,
          unshieldedAddress,
        }),
      });

      if (!proveResponse.ok) {
        const proveData = await proveResponse.json().catch(() => ({ error: "Proving failed" }));
        throw new Error(proveData.error || `Proving failed (HTTP ${proveResponse.status})`);
      }

      const proveData = await proveResponse.json();
      const { provenTx, pendingId } = proveData;

      await signAndSubmit(provenTx);

      const commitResponse = await fetch("/api/contract/prove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commit: true,
          pendingId,
          accountId: shieldedAddresses.shieldedAddress,
          txHash: "lace-submitted",
        }),
      });
      if (!commitResponse.ok) {
        const commitData = await commitResponse.json().catch(() => ({ error: "Private state commit failed" }));
        throw new Error(commitData.error || "Transaction submitted but private state could not be persisted");
      }

      setState({ loading: false, error: null, submitted: true, accountId });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      if (message.includes("Failed to fetch") || message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
        setState({
          loading: false,
          error: "Cannot reach proof server. Make sure the interact server is running (npm run interact-server).",
          submitted: false,
          accountId,
        });
        throw new Error("Cannot reach proof server. Make sure the interact server is running.");
      }
      setState({
        loading: false,
        error: message,
        submitted: false,
        accountId,
      });
      throw err;
    }
  }, [accountId, asset, onSuccess, signAndSubmit, isConnected, api, version]);

  const stateForConnectedAccount = (state: ActionState): ActionState =>
    state.accountId === accountId ? state : INITIAL_STATE;

  return {
    deposit: (amount: string) => executeAction("supply", amount),
    withdraw: (amount: string) => executeAction("withdraw", amount),
    borrow: (amount: string) => executeAction("borrow", amount),
    repay: (amount: string) => executeAction("repay", amount),
    states: {
      deposit: stateForConnectedAccount(depositState),
      withdraw: stateForConnectedAccount(withdrawState),
      borrow: stateForConnectedAccount(borrowState),
      repay: stateForConnectedAccount(repayState),
    },
  };
}
