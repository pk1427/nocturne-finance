/**
 * Complete one-shot workflow for nocturne_lending_multi on Preview:
 *   1. Ensure DUST generation is registered and spendable DUST is available.
 *   2. Deploy the experimental multi contract if not already deployed.
 *   3. Initialize the contract and enable tUSDC if not already initialized.
 *
 * Non-interactive. No post-deployment custody transactions.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';

import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { resolveNetwork, getOrCreateSeed, recordDeployment } from './network.js';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet.js';
import { artifactPath, manifestPath, loadMultiManifest, emptyManifest, MULTI_CONTRACT_NAME, MULTI_DEPLOYMENT_ID, MULTI_PRIVATE_STATE_STORE, TUSDC_COLOR } from './multi-config.js';

// @ts-expect-error Required by Midnight subscriptions.
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'nocturneLendingMultiPrivateState';
const { network, config: networkConfig } = resolveNetwork();

if (network !== 'preview') {
  throw new Error('deploy-multi-complete requires --network preview');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contract', 'managed', MULTI_CONTRACT_NAME);
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  throw new Error('Missing nocturne_lending_multi artifacts; compile first: cd contract && npm run compile');
}

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

function hexToBytes32(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  if (clean.length !== 64) throw new Error(`Expected 64-char hex for Bytes<32>, got ${clean.length}: ${hex}`);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function waitForProofServer(maxAttempts = 60, delayMs = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fetch(networkConfig.proofServer, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return true;
    } catch (err: any) {
      const code = err?.cause?.code || err?.code || '';
      if (code !== 'ECONNREFUSED' && code !== 'UND_ERR_CONNECT_TIMEOUT' && code !== 'UND_ERR_SOCKET') {
        return true;
      }
    }
    if (attempt < maxAttempts) {
      process.stdout.write(`\r  Waiting for proof server... (${attempt}/${maxAttempts})   `);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      const delayMs = attempt * 10_000;
      console.warn(`  ${label} interrupted (attempt ${attempt}/${maxRetries}); retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`${label} did not complete`);
}

async function ensureDust(walletCtx: WalletContext): Promise<void> {
  console.log('─── DUST Token Setup ───────────────────────────────────────────\n');
  const dustState = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));

  const nativeTokenRaw = unshieldedToken().raw;
  const unregisteredUtxos = dustState.unshielded.availableCoins.filter(
    (c: any) => !c.meta?.registeredForDustGeneration && c.utxo?.type === nativeTokenRaw,
  );

  if (unregisteredUtxos.length > 0) {
    console.log(`  Registering ${unregisteredUtxos.length} NIGHT UTXOs for DUST generation...`);
    const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
      unregisteredUtxos,
      walletCtx.unshieldedKeystore.getPublicKey(),
      (payload) => walletCtx.unshieldedKeystore.signData(payload),
    );
    const finalized = await walletCtx.wallet.finalizeRecipe(recipe);
    await walletCtx.wallet.submitTransaction(finalized);
    console.log('  ✓ DUST generation registration submitted.\n');
  } else {
    console.log('  ✓ No unregistered NIGHT UTXOs found.\n');
  }

  const currentDust = dustState.dust.balance(new Date());
  if (currentDust === 0n) {
    console.log('  Waiting for spendable DUST...');
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.filter((s) => s.isSynced),
        Rx.filter((s) => s.dust.balance(new Date()) > 0n),
      ),
    );
  }
  const postDust = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const spendable = postDust.dust.balance(new Date());
  console.log(`  ✓ Spendable DUST available: ${spendable.toString()} raw\n`);
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

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Deploy & Initialize ${MULTI_CONTRACT_NAME} (${network})`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const manifestPathStr = manifestPath();
  let manifest = fs.existsSync(manifestPathStr) ? loadMultiManifest(network) : emptyManifest(network);

  if (manifest.contractName !== MULTI_CONTRACT_NAME || manifest.deploymentId !== MULTI_DEPLOYMENT_ID || manifest.privateStateStore !== MULTI_PRIVATE_STATE_STORE) {
    throw new Error('Experimental deployment safety check failed');
  }

  const seed = getOrCreateSeed(network);
  const walletCtx = await createWallet({ network, networkConfig, seed });
  await walletCtx.wallet.waitForSyncedState();
  await persistWalletState(network, walletCtx);

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  let balance = (await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)))).unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`  Wallet Address: ${address}`);
  console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

  await ensureDust(walletCtx);

  let contractAddress = manifest.contractAddress;
  if (!contractAddress) {
    console.log('─── Deploy Contract ────────────────────────────────────────────\n');
    const providers = await createProviders(walletCtx);
    console.log('  Deploying...');
    const deployed = await callWithRetries('Deploy', async () => {
      return deployContract(providers as any, {
        compiledContract: compiledContract as any,
        args: [],
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {},
      });
    });
    contractAddress = deployed.deployTxData.public.contractAddress;
    manifest = {
      ...manifest,
      contractAddress,
      deployedAt: new Date().toISOString(),
    };
    fs.writeFileSync(manifestPathStr, JSON.stringify(manifest, null, 2) + '\n');
    recordDeployment(network, contractAddress, address.toString());
    console.log(`  ✓ Deployed at ${contractAddress}`);
    console.log(`  Transaction: ${deployed.deployTxData.public.txId ?? '(not exposed)'}\n`);
  } else {
    console.log('─── Contract Already Deployed ──────────────────────────────────\n');
    console.log(`  Address: ${contractAddress}\n`);
  }

  console.log('─── Proof Server ──────────────────────────────────────────────\n');
  const proofServerReady = await waitForProofServer();
  if (!proofServerReady) {
    console.log('\n  ❌ Proof server not responding. Run: docker compose up -d\n');
    await walletCtx.wallet.stop();
    process.exit(1);
  }
  console.log('  ✓ Proof server ready.\n');

  const tusdcColorBytes = hexToBytes32(TUSDC_COLOR);
  const before = await readPublicReserveState(contractAddress);

  if (isInitialized(before)) {
    console.log('  Contract is already initialized.');
    printPublicReserveState(before);
  } else {
    console.log('─── Initialize Contract ───────────────────────────────────────\n');
    const providers = await createProviders(walletCtx);
    const MAX_DUST_RETRIES = 20;
    const DUST_RETRY_DELAY_MS = 5_000;
    for (let attempt = 1; attempt <= MAX_DUST_RETRIES; attempt++) {
      try {
        const result = await callWithRetries(`initialize (attempt ${attempt}/${MAX_DUST_RETRIES})`, async () => {
          const deployed: any = await findDeployedContract(providers, {
            compiledContract: compiledContract as any,
            contractAddress,
            privateStateId: PRIVATE_STATE_ID,
            initialPrivateState: {},
          });
          const timestamp = BigInt(Math.floor(Date.now() / 1000));
          return deployed.callTx.initialize(tusdcColorBytes, timestamp);
        });
        console.log(`  ✓ initialize transaction: ${result.public.txId}`);
        break;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const isDustShortage = /Not enough Dust|Insufficient Funds|could not balance dust/i.test(errMsg);
        if (isDustShortage && attempt < MAX_DUST_RETRIES) {
          const dustBalance = await walletCtx.wallet.waitForSyncedState().then(s => s.dust.balance(new Date()));
          console.log(`  ⏳ DUST balance: ${dustBalance.toString()} raw (attempt ${attempt}/${MAX_DUST_RETRIES}); retrying in ${DUST_RETRY_DELAY_MS / 1000}s...`);
          await new Promise((r) => setTimeout(r, DUST_RETRY_DELAY_MS));
          continue;
        }
        throw error;
      }
    }

    await delay(10_000);
    const afterInit = await readPublicReserveState(contractAddress);
    if (isInitialized(afterInit)) {
      console.log('  ✓ Initialization confirmed by public indexer.');
      printPublicReserveState(afterInit);
    } else {
      console.log('  ℹ Initialization submitted; indexer confirmation pending.');
    }
  }

  if (isTUsdcEnabled(before) || isTUsdcEnabled(await readPublicReserveState(contractAddress))) {
    console.log('\n  tUSDC is already enabled.');
  } else {
    console.log('\n─── Enable tUSDC ──────────────────────────────────────────────\n');
    const providers = await createProviders(walletCtx);
    const result = await callWithRetries('configure_tusdc', async () => {
      const deployed: any = await findDeployedContract(providers, {
        compiledContract: compiledContract as any,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {},
      });
      return deployed.callTx.configure_tusdc(tusdcColorBytes);
    });
    console.log(`  ✓ configure_tusdc transaction: ${result.public.txId}`);

    await delay(10_000);
    const afterConfig = await readPublicReserveState(contractAddress);
    if (isTUsdcEnabled(afterConfig)) {
      console.log('  ✓ tUSDC configuration confirmed by public indexer.');
      printPublicReserveState(afterConfig);
    } else {
      console.log('  ℹ tUSDC configuration submitted; indexer confirmation pending.');
    }
  }

  console.log('\n─── Complete ──────────────────────────────────────────────────\n');
  console.log(`  Contract: ${contractAddress}`);
  console.log(`  Network: ${network}`);
  console.log(`  State file: ${manifestPath()}`);
  console.log('  Existing tNight deployment untouched.');
  console.log('  No custody transactions performed.\n');

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
}


main().catch((error) => {
  console.error("Deploy/initialize failed:", error);
  process.exit(1);
});
