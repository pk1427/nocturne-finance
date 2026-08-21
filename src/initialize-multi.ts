/** Initialize and configure the deployed nocturne_lending_multi contract. */
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
import { resolveNetwork, getOrCreateSeed } from './network.js';
import { createWallet, persistWalletState, type WalletContext } from './wallet.js';
import { artifactPath, manifestPath, MULTI_CONTRACT_NAME, MULTI_PRIVATE_STATE_STORE, loadMultiManifest } from './multi-config.js';

// @ts-expect-error Required by Midnight indexer subscriptions in Node.
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'nocturneLendingMultiPrivateState';
const { network, config: networkConfig } = resolveNetwork();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contract', 'managed', MULTI_CONTRACT_NAME);
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) throw new Error('Multi contract artifacts missing. Run `cd contract && npm run compile`.');

const manifest = loadMultiManifest(network);
if (manifest.contractAddress === null) throw new Error('Multi contract is not deployed yet. Run `npm run deploy-multi` first.');

const NocturneLendingMulti = await import(pathToFileURL(contractPath).href);

const compiledContract = CompiledContract.make(MULTI_CONTRACT_NAME, class extends NocturneLendingMulti.Contract {
  constructor() {
    super({
      tNightSupplied: (ctx: any) => [ctx.privateState, ctx.privateState.tNightSupplied ?? 0n],
      tNightBorrowed: (ctx: any) => [ctx.privateState, ctx.privateState.tNightBorrowed ?? 0n],
      setTNightPosition: (_ctx: any, supplied: bigint, borrowed: bigint) => [{ tNightSupplied: supplied, tNightBorrowed: borrowed, tUsdcSupplied: _ctx.privateState.tUsdcSupplied ?? 0n, tUsdcBorrowed: _ctx.privateState.tUsdcBorrowed ?? 0n }, []],
      tUsdcSupplied: (ctx: any) => [ctx.privateState, ctx.privateState.tUsdcSupplied ?? 0n],
      tUsdcBorrowed: (ctx: any) => [ctx.privateState, ctx.privateState.tUsdcBorrowed ?? 0n],
      setTUsdcPosition: (_ctx: any, supplied: bigint) => [{ tNightSupplied: _ctx.privateState.tNightSupplied ?? 0n, tNightBorrowed: _ctx.privateState.tNightBorrowed ?? 0n, tUsdcSupplied: supplied, tUsdcBorrowed: _ctx.privateState.tUsdcBorrowed ?? 0n }, []],
      setTUsdcBorrowedPosition: (_ctx: any, borrowed: bigint) => [{ tNightSupplied: _ctx.privateState.tNightSupplied ?? 0n, tNightBorrowed: _ctx.privateState.tNightBorrowed ?? 0n, tUsdcSupplied: _ctx.privateState.tUsdcSupplied ?? 0n, tUsdcBorrowed: borrowed }, []],
    });
  }
}).pipe(CompiledContract.withCompiledFileAssets(zkConfigPath));

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [5_000, 10_000, 20_000] as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ReserveState = {
  enabled: boolean;
  tokenColor: string;
  totalSupplied: bigint;
  totalBorrowed: bigint;
  supplyIndex: bigint;
  borrowIndex: bigint;
};

type PublicMultiState = {
  tNightReserve: ReserveState;
  tUsdcReserve: ReserveState;
};

async function readPublicReserveState(contractAddress: string): Promise<PublicMultiState> {
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
  return NocturneLendingMulti.ledger(compactState.data) as PublicMultiState;
}

function isInitialized(state: PublicMultiState): boolean {
  return state.tNightReserve.enabled === true
    && state.tNightReserve.supplyIndex === 1_000_000n
    && state.tNightReserve.borrowIndex === 1_000_000n
    && state.tUsdcReserve.tokenColor !== ''
    && state.tUsdcReserve.supplyIndex === 1_000_000n
    && state.tUsdcReserve.borrowIndex === 1_000_000n;
}

function isTUsdcEnabled(state: PublicMultiState): boolean {
  return state.tUsdcReserve.enabled === true;
}

function printPublicReserveState(state: PublicMultiState): void {
  console.log({
    tNightReserve: {
      enabled: state.tNightReserve.enabled,
      tokenColor: state.tNightReserve.tokenColor,
      totalSupplied: state.tNightReserve.totalSupplied.toString(),
      totalBorrowed: state.tNightReserve.totalBorrowed.toString(),
      supplyIndex: state.tNightReserve.supplyIndex.toString(),
      borrowIndex: state.tNightReserve.borrowIndex.toString(),
    },
    tUsdcReserve: {
      enabled: state.tUsdcReserve.enabled,
      tokenColor: state.tUsdcReserve.tokenColor,
      totalSupplied: state.tUsdcReserve.totalSupplied.toString(),
      totalBorrowed: state.tUsdcReserve.totalBorrowed.toString(),
      supplyIndex: state.tUsdcReserve.supplyIndex.toString(),
      borrowIndex: state.tUsdcReserve.borrowIndex.toString(),
    },
  });
}

async function createProviders(walletCtx: WalletContext) {
  const password = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Dev-Development-Placeholder-1';
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();
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
      privateStateStoreName: MULTI_PRIVATE_STATE_STORE,
      accountId,
      privateStoragePasswordProvider: () => password,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS, WebSocket as any),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

function hexToBytes32(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  if (clean.length !== 64) throw new Error(`Expected 64-char hex for Bytes<32>, got ${clean.length}: ${hex}`);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function callWithRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const message = `${error?.message ?? ''} ${error?.cause?.message ?? ''}`;
      const transient = /disconnect|timed out|timeout|submission error|submission failed|connection reset|ECONNRESET|ECONNREFUSED/i.test(message);
      if (!transient || attempt === maxRetries) throw error;
      const delay = attempt * 10_000;
      console.warn(`  ${label} interrupted (attempt ${attempt}/${maxRetries}); retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${label} did not complete`);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Initialize ${MULTI_CONTRACT_NAME} (${network})`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const contractAddress = manifest.contractAddress;
  const tusdcColor = manifest.tusdcTokenColor;
  const tusdcColorBytes = hexToBytes32(tusdcColor);
  console.log(`  Contract: ${contractAddress}`);
  console.log(`  tUSDC color: ${tusdcColor}\n`);

  const DUST_RETRY_DELAY_MS = 5_000;

  const before = await readPublicReserveState(contractAddress);
  if (isInitialized(before)) {
    console.log('  Contract is already initialized according to the public indexer.');
    printPublicReserveState(before);
  } else {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let walletCtx: WalletContext | undefined;
      try {
        console.log(`  Initialization attempt ${attempt}/${MAX_ATTEMPTS}...`);
        walletCtx = await createWallet({ network, networkConfig, seed: getOrCreateSeed(network) });
        await walletCtx.wallet.waitForSyncedState();
        const providers = await createProviders(walletCtx);
        const result = await callWithRetries(`initialize (attempt ${attempt}/${MAX_ATTEMPTS})`, async () => {
          const deployed: any = await findDeployedContract(providers, {
            compiledContract: compiledContract as any,
            contractAddress,
            privateStateId: PRIVATE_STATE_ID,
            initialPrivateState: {},
          });
          const timestamp = BigInt(Math.floor(Date.now() / 1000));
          return deployed.callTx.initialize(tusdcColorBytes, timestamp);
        });
        console.log(`  initialize transaction: ${result.public.txId}`);
      } catch (error) {
        lastError = error;
        const errMsg = error instanceof Error ? error.message : String(error);
        const isDustShortage = /Not enough Dust|Insufficient Funds|could not balance dust/i.test(errMsg);
        if (isDustShortage && attempt < MAX_ATTEMPTS) {
          const dustBalance = walletCtx?.wallet ? await walletCtx.wallet.waitForSyncedState().then(s => s.dust.balance(new Date())) : 0n;
          console.log(`  ⏳ DUST balance: ${dustBalance.toString()} raw (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${DUST_RETRY_DELAY_MS / 1000}s...`);
          await new Promise((r) => setTimeout(r, DUST_RETRY_DELAY_MS));
          continue;
        }
        console.error(`  Attempt ${attempt} initialization failed:`, errMsg);
      } finally {
        if (walletCtx) {
          await persistWalletState(network, walletCtx).catch(() => undefined);
          await walletCtx.wallet.stop().catch(() => undefined);
        }
      }

      await delay(BACKOFF_MS[attempt - 1]);
      const observed = await readPublicReserveState(contractAddress);
      if (isInitialized(observed)) {
        console.log('  Initialization confirmed by the public indexer.');
        printPublicReserveState(observed);
        break;
      }
      console.log('  Indexer still reports an uninitialized reserve after this attempt.');
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`Initialization was not confirmed after ${MAX_ATTEMPTS} attempts. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
      }
    }
  }

  if (isTUsdcEnabled(before) || isTUsdcEnabled(await readPublicReserveState(contractAddress))) {
    console.log('\n  tUSDC is already enabled.');
  } else {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let walletCtx: WalletContext | undefined;
      try {
        console.log(`  configure_tusdc attempt ${attempt}/${MAX_ATTEMPTS}...`);
        walletCtx = await createWallet({ network, networkConfig, seed: getOrCreateSeed(network) });
        await walletCtx.wallet.waitForSyncedState();
        const providers = await createProviders(walletCtx);
        const result = await callWithRetries(`configure_tusdc (attempt ${attempt}/${MAX_ATTEMPTS})`, async () => {
          const deployed: any = await findDeployedContract(providers, {
            compiledContract: compiledContract as any,
            contractAddress,
            privateStateId: PRIVATE_STATE_ID,
            initialPrivateState: {},
          });
          return deployed.callTx.configure_tusdc(tusdcColorBytes);
        });
        console.log(`  configure_tusdc transaction: ${result.public.txId}`);
      } catch (error) {
        lastError = error;
        const errMsg = error instanceof Error ? error.message : String(error);
        const isDustShortage = /Not enough Dust|Insufficient Funds|could not balance dust/i.test(errMsg);
        if (isDustShortage && attempt < MAX_ATTEMPTS) {
          const dustBalance = walletCtx?.wallet ? await walletCtx.wallet.waitForSyncedState().then(s => s.dust.balance(new Date())) : 0n;
          console.log(`  ⏳ DUST balance: ${dustBalance.toString()} raw (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${DUST_RETRY_DELAY_MS / 1000}s...`);
          await new Promise((r) => setTimeout(r, DUST_RETRY_DELAY_MS));
          continue;
        }
        console.error(`  Attempt ${attempt} configure_tusdc failed:`, errMsg);
      } finally {
        if (walletCtx) {
          await persistWalletState(network, walletCtx).catch(() => undefined);
          await walletCtx.wallet.stop().catch(() => undefined);
        }
      }

      await delay(BACKOFF_MS[attempt - 1]);
      const observed = await readPublicReserveState(contractAddress);
      if (isTUsdcEnabled(observed)) {
        console.log('  tUSDC configuration confirmed by the public indexer.');
        printPublicReserveState(observed);
        break;
      }
      console.log('  Indexer still reports tUSDC as disabled after this attempt.');
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`tUSDC configuration was not confirmed after ${MAX_ATTEMPTS} attempts. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
      }
    }
  }

  console.log('\n─── Initialization complete ────────────────────────────────────────\n');
}

main().catch((error) => {
  console.error('Initialization failed:', error);
  process.exit(1);
});
