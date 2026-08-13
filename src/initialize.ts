/** Initialize the fixed reserve on an already deployed Nocturne contract. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { resolveNetwork, getOrCreateSeed, getDeployment } from './network';
import { createWallet, persistWalletState, type WalletContext } from './wallet';
import { newUserPosition } from '../contract/src/reserve-config.js';

// @ts-expect-error Required by Midnight indexer subscriptions in Node.
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'nocturneLendingPrivateState';
const { network, config: networkConfig } = resolveNetwork();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contract', 'managed', 'nocturne_lending');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) throw new Error('Contract is not compiled. Run `cd contract && npm run compile`.');
const NocturneLending = await import(pathToFileURL(contractPath).href);

const contract = CompiledContract.make('nocturne-lending', class extends NocturneLending.Contract {
  constructor() {
    super({
      userSupplied: (ctx: any) => [ctx.privateState, ctx.privateState.userSupplied],
      userBorrowed: (ctx: any) => [ctx.privateState, ctx.privateState.userBorrowed],
      userLastSupplyIndex: (ctx: any) => [ctx.privateState, ctx.privateState.userLastSupplyIndex],
      userLastBorrowIndex: (ctx: any) => [ctx.privateState, ctx.privateState.userLastBorrowIndex],
      setUserPosition: (_ctx: any, supplied: bigint, borrowed: bigint, lastSupply: bigint, lastBorrow: bigint) => [
        { userSupplied: supplied, userBorrowed: borrowed, userLastSupplyIndex: lastSupply, userLastBorrowIndex: lastBorrow },
        [],
      ],
    });
  }
}).pipe(CompiledContract.withCompiledFileAssets(zkConfigPath));

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [5_000, 10_000, 20_000] as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PublicReserveState = {
  totalSupplied: bigint;
  totalBorrowed: bigint;
  supplyIndex: bigint;
  borrowIndex: bigint;
  lastAccrualTimestamp: bigint;
  reserveParams: {
    collateralFactor: bigint;
    baseRate: bigint;
    slope1: bigint;
    slope2: bigint;
    kink: bigint;
    reserveFactor: bigint;
    liquidationThreshold: bigint;
  };
};

async function readPublicReserveState(contractAddress: string): Promise<PublicReserveState> {
  const response = await fetch(networkConfig.indexer, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { contractAction(address: "${contractAddress}") { state } }`,
    }),
  });
  if (!response.ok) throw new Error(`Indexer request failed: HTTP ${response.status}`);
  const payload = await response.json() as { data?: { contractAction?: { state?: string } }; errors?: Array<{ message?: string }> };
  if (payload.errors?.[0]?.message) throw new Error(`Indexer error: ${payload.errors[0].message}`);
  const encodedState = payload.data?.contractAction?.state;
  if (!encodedState) throw new Error('Indexer returned no contract state');
  const compactState = ContractState.deserialize(new Uint8Array(Buffer.from(encodedState.replace(/^0x/, ''), 'hex')));
  return NocturneLending.ledger(compactState.data) as PublicReserveState;
}

function isInitialized(state: PublicReserveState): boolean {
  return state.supplyIndex === 1_000_000n
    && state.borrowIndex === 1_000_000n
    && state.reserveParams.collateralFactor === 7_500n
    && state.reserveParams.kink === 8_000n
    && state.reserveParams.baseRate === 100n
    && state.reserveParams.slope1 === 900n
    && state.reserveParams.slope2 === 4_000n
    && state.reserveParams.reserveFactor === 1_000n
    && state.reserveParams.liquidationThreshold === 8_000n;
}

function printPublicReserveState(state: PublicReserveState): void {
  console.log({
    totalSupplied: state.totalSupplied.toString(),
    totalBorrowed: state.totalBorrowed.toString(),
    supplyIndex: state.supplyIndex.toString(),
    borrowIndex: state.borrowIndex.toString(),
    lastAccrualTimestamp: state.lastAccrualTimestamp.toString(),
    reserveParams: Object.fromEntries(
      Object.entries(state.reserveParams).map(([key, value]) => [key, value.toString()]),
    ),
  });
}

async function createProviders(walletCtx: WalletContext) {
  const password = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx),
  };
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'nocturne-lending-state',
      accountId: walletCtx.unshieldedKeystore.getBech32Address().toString(),
      privateStoragePasswordProvider: () => password,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS, WebSocket),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

async function main() {
  const deployment = getDeployment(network);
  if (!deployment) throw new Error(`No ${network} deployment recorded.`);

  const before = await readPublicReserveState(deployment.address);
  if (isInitialized(before)) {
    console.log(`Contract ${deployment.address} is already initialized according to the public indexer.`);
    printPublicReserveState(before);
    return;
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let walletCtx: WalletContext | undefined;
    try {
      console.log(`Initialization attempt ${attempt}/${MAX_ATTEMPTS}...`);
      walletCtx = await createWallet({ network, networkConfig, seed: getOrCreateSeed(network) });
      await walletCtx.wallet.waitForSyncedState();
      const providers = await createProviders(walletCtx);
      const deployed: any = await findDeployedContract(providers, {
        compiledContract: contract as any,
        contractAddress: deployment.address,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: newUserPosition(),
      });
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const result = await deployed.callTx.initialize(timestamp);
      console.log(`Submission returned transaction: ${result.public.txId}`);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} submission failed:`, error instanceof Error ? error.message : error);
    } finally {
      if (walletCtx) {
        await persistWalletState(network, walletCtx).catch(() => undefined);
        await walletCtx.wallet.stop().catch(() => undefined);
      }
    }

    // A dropped watch connection can occur after a node accepted the tx. The
    // indexer is the source of truth before a retry is allowed.
    await delay(BACKOFF_MS[attempt - 1]);
    const observed = await readPublicReserveState(deployment.address);
    if (isInitialized(observed)) {
      console.log('Initialization confirmed by the public indexer.');
      printPublicReserveState(observed);
      return;
    }
    console.log('Indexer still reports an uninitialized reserve after this attempt.');
  }

  throw new Error(`Initialization was not confirmed after ${MAX_ATTEMPTS} attempts. Last submission error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

main().catch((error) => {
  console.error('Initialization failed:', error);
  process.exit(1);
});
