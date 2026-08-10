"use client";

import { useState, useCallback } from "react";
import { useContractActions } from "@/hooks/useContractActions";
import { useContractState } from "@/hooks/useContractState";
import { useWallet } from "@/hooks/useWallet";
import { TransactionPreview } from "@/components/TransactionPreview";
import { WalletConnectModal } from "@/components/WalletConnectModal";
import { WalletButton } from "@/components/WalletButton";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "undeployed";

type ActionType = "deposit" | "withdraw" | "borrow" | "repay";

type PendingAction = {
  type: ActionType;
  amount: string;
};

function ActionCard({
  title,
  description,
  amount,
  onAmountChange,
  onConfirm,
  loading,
  error,
  txHash,
  buttonColor = "bg-indigo-600 hover:bg-indigo-500",
}: {
  title: string;
  description: string;
  amount: string;
  onAmountChange: (value: string) => void;
  onConfirm: () => void;
  loading: boolean;
  error: string | null;
  txHash: string | null;
  buttonColor?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <div className="flex gap-3">
        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="Amount"
          className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={onConfirm}
          disabled={loading || !amount || Number(amount) <= 0}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${buttonColor}`}
        >
          {loading ? "Processing..." : title}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {txHash && (
        <p className="text-green-400 text-xs mt-2">
          TX: <span className="font-mono break-all">{txHash}</span>
        </p>
      )}
    </div>
  );
}

export default function AppPage() {
  const { info: walletInfo, loading: walletLoading, refresh: refreshWallet, formatAddress } = useWallet();
  const { totalSupplied, totalBorrowed, supplyIndex, borrowIndex, lastAccrualTimestamp, loading: contractLoading, error: contractError, refetch } = useContractState();
  const { deposit, withdraw, borrow, repay, states } = useContractActions(refetch);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [pendingActionAfterConnect, setPendingActionAfterConnect] = useState<ActionType | null>(null);

  const isConnected = !!walletInfo?.address;

  const handleActionClick = useCallback((type: ActionType, amount: string) => {
    if (!amount || Number(amount) <= 0) return;

    if (!isConnected) {
      setPendingActionAfterConnect(type);
      setShowWalletModal(true);
      return;
    }

    setPendingAction({ type, amount });
  }, [isConnected]);

  const handleWalletConnect = useCallback(async () => {
    await refreshWallet();
    setShowWalletModal(false);

    if (pendingActionAfterConnect) {
      const actionMap: Record<string, string> = {
        deposit: depositAmount,
        withdraw: withdrawAmount,
        borrow: borrowAmount,
        repay: repayAmount,
      };
      const amount = actionMap[pendingActionAfterConnect];
      if (amount && Number(amount) > 0) {
        setPendingAction({ type: pendingActionAfterConnect, amount });
      }
      setPendingActionAfterConnect(null);
    }
  }, [refreshWallet, pendingActionAfterConnect, depositAmount, withdrawAmount, borrowAmount, repayAmount]);

  const handleConfirmTransaction = useCallback(async () => {
    if (!pendingAction) return;
    const { type, amount } = pendingAction;
    setPendingAction(null);

    switch (type) {
      case "deposit":
        await deposit(amount);
        break;
      case "withdraw":
        await withdraw(amount);
        break;
      case "borrow":
        await borrow(amount);
        break;
      case "repay":
        await repay(amount);
        break;
    }
  }, [pendingAction, deposit, withdraw, borrow, repay]);

  const handleCloseModals = useCallback(() => {
    setPendingAction(null);
    setShowWalletModal(false);
    setPendingActionAfterConnect(null);
  }, []);

  const getTransactionDetails = useCallback(() => {
    if (!pendingAction) return [];
    const { type, amount } = pendingAction;
    return [
      { label: "Action", value: type.charAt(0).toUpperCase() + type.slice(1) },
      { label: "Amount", value: `${Number(amount).toLocaleString()} tDUST` },
      { label: "Network", value: walletInfo?.network ?? "—" },
      { label: "Contract", value: CONTRACT_ADDRESS ? `${CONTRACT_ADDRESS.slice(0, 10)}...${CONTRACT_ADDRESS.slice(-6)}` : "—" },
    ];
  }, [pendingAction, walletInfo]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <h1 className="text-4xl font-bold">Nocturne Finance</h1>
            <p className="text-gray-400 text-lg max-w-md text-center">
              Privacy-preserving lending & borrowing on Midnight. Connect your
              wallet to get started.
            </p>
            <button
              onClick={() => setShowWalletModal(true)}
              className="rounded-lg bg-indigo-600 px-8 py-3 font-semibold hover:bg-indigo-500 transition"
            >
              Connect Wallet
            </button>
            <p className="text-gray-500 text-sm">
              Uses a server-side wallet for signing
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Dashboard</h2>
              </div>
              <WalletButton />
            </div>

            {contractError && (
              <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 px-4 py-3">
                <p className="text-yellow-400 text-sm">{contractError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Total Supplied</p>
                <p className="text-2xl font-bold mt-2">
                  {contractLoading ? "..." : totalSupplied !== null ? totalSupplied.toLocaleString() : "0"}
                </p>
                <p className="text-xs text-gray-500 mt-1">raw units</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Total Borrowed</p>
                <p className="text-2xl font-bold mt-2">
                  {contractLoading ? "..." : totalBorrowed !== null ? totalBorrowed.toLocaleString() : "0"}
                </p>
                <p className="text-xs text-gray-500 mt-1">raw units</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <p className="text-gray-400 text-sm">Supply Index</p>
                <p className="text-2xl font-bold mt-2">
                  {contractLoading ? "..." : supplyIndex !== null ? supplyIndex.toLocaleString() : "0"}
                </p>
                <p className="text-xs text-gray-500 mt-1">raw units</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-sm">Pool State</p>
                <button
                  onClick={refetch}
                  disabled={contractLoading}
                  className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Borrow Index</p>
                  <p className="font-mono">{borrowIndex !== null ? borrowIndex.toLocaleString() : "—"}</p>
                  <p className="text-xs text-gray-500 mt-1">raw units</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Accrual</p>
                  <p className="font-mono">{lastAccrualTimestamp !== null ? lastAccrualTimestamp.toLocaleString() : "—"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionCard
                title="Deposit"
                description="Supply assets to the lending pool"
                amount={depositAmount}
                onAmountChange={setDepositAmount}
                onConfirm={() => handleActionClick("deposit", depositAmount)}
                loading={states.deposit.loading}
                error={states.deposit.error}
                txHash={states.deposit.txHash}
              />
              <ActionCard
                title="Withdraw"
                description="Withdraw supplied assets from the pool"
                amount={withdrawAmount}
                onAmountChange={setWithdrawAmount}
                onConfirm={() => handleActionClick("withdraw", withdrawAmount)}
                loading={states.withdraw.loading}
                error={states.withdraw.error}
                txHash={states.withdraw.txHash}
                buttonColor="bg-emerald-600 hover:bg-emerald-500"
              />
              <ActionCard
                title="Borrow"
                description="Borrow assets from the lending pool"
                amount={borrowAmount}
                onAmountChange={setBorrowAmount}
                onConfirm={() => handleActionClick("borrow", borrowAmount)}
                loading={states.borrow.loading}
                error={states.borrow.error}
                txHash={states.borrow.txHash}
                buttonColor="bg-amber-600 hover:bg-amber-500"
              />
              <ActionCard
                title="Repay"
                description="Repay borrowed assets to the pool"
                amount={repayAmount}
                onAmountChange={setRepayAmount}
                onConfirm={() => handleActionClick("repay", repayAmount)}
                loading={states.repay.loading}
                error={states.repay.error}
                txHash={states.repay.txHash}
                buttonColor="bg-rose-600 hover:bg-rose-500"
              />
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400 text-sm mb-2">
                Contract: <span className="font-mono text-xs break-all">{CONTRACT_ADDRESS || "Not configured"}</span>
              </p>
              <p className="text-gray-500 text-xs">
                 Reading from {NETWORK} network
              </p>
            </div>
          </div>
        )}

        <TransactionPreview
          isOpen={!!pendingAction}
          onClose={handleCloseModals}
          onConfirm={handleConfirmTransaction}
          loading={pendingAction ? states[pendingAction.type]?.loading : false}
          details={getTransactionDetails()}
        />

        <WalletConnectModal
          isOpen={showWalletModal}
          onClose={handleCloseModals}
          onConnect={handleWalletConnect}
        />
      </div>
    </main>
  );
}
