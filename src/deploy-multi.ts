import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { resolveNetwork, getOrCreateSeed } from './network.js';
import { createWallet, persistWalletState } from './wallet.js';
import { artifactPath, emptyManifest, manifestPath, loadMultiManifest, MULTI_CONTRACT_NAME, MULTI_DEPLOYMENT_ID, MULTI_PRIVATE_STATE_STORE } from './multi-config.js';
// @ts-expect-error Required by Midnight subscriptions.
globalThis.WebSocket = WebSocket;

const { network, config } = resolveNetwork();
if (network !== 'preview') throw new Error('deploy-multi requires --network preview');
const artifact = artifactPath();
const contractPath = path.join(artifact, 'contract', 'index.js');
if (!fs.existsSync(contractPath)) throw new Error('Missing nocturne_lending_multi artifacts; compile first');
let manifest = fs.existsSync(manifestPath()) ? loadMultiManifest(network) : emptyManifest(network);
if (manifest.contractName !== MULTI_CONTRACT_NAME || manifest.deploymentId !== MULTI_DEPLOYMENT_ID || manifest.privateStateStore !== MULTI_PRIVATE_STATE_STORE) throw new Error('Experimental deployment safety check failed');
if (manifest.contractAddress) { console.log(`Experimental contract already deployed at ${manifest.contractAddress}`); process.exit(0); }
if (process.env.MULTI_DEPLOY_CONFIRM !== '1') { console.log('Safety stop: set MULTI_DEPLOY_CONFIRM=1 only after reviewing this isolated deployment. No transaction submitted.'); process.exit(0); }
const Generated = await import(pathToFileURL(contractPath).href);
const compiled = CompiledContract.make(MULTI_CONTRACT_NAME, class extends Generated.Contract { constructor() { super({ tNightSupplied: (ctx: any) => [ctx.privateState, ctx.privateState.tNightSupplied ?? 0n], tNightBorrowed: (ctx: any) => [ctx.privateState, ctx.privateState.tNightBorrowed ?? 0n], setTNightPosition: (_ctx: any, supplied: bigint, borrowed: bigint) => [{ tNightSupplied: supplied, tNightBorrowed: borrowed }, []], tUsdcSupplied: (ctx: any) => [ctx.privateState, ctx.privateState.tUsdcSupplied ?? 0n], setTUsdcPosition: (_ctx: any, supplied: bigint) => [{ tUsdcSupplied: supplied }, []] }); } } as any).pipe(CompiledContract.withCompiledFileAssets(artifact));
const walletCtx = await createWallet({ network, networkConfig: config, seed: getOrCreateSeed(network) });
await walletCtx.wallet.waitForSyncedState();
const walletProvider = { getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey, getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey, async balanceTx(tx: any, ttl?: Date) { const recipe = await walletCtx.wallet.balanceUnboundTransaction(tx, { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey }, { ttl: ttl ?? new Date(Date.now() + 1800000) }); return walletCtx.wallet.finalizeRecipe(recipe); }, submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) };
const zk = new NodeZkConfigProvider(artifact);
const providers = { privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: MULTI_PRIVATE_STATE_STORE, accountId: walletCtx.unshieldedKeystore.getBech32Address().toString(), privateStoragePasswordProvider: () => process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Dev-Development-Placeholder-1' }), publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS, WebSocket as any), zkConfigProvider: zk, proofProvider: httpClientProofProvider(config.proofServer, zk), walletProvider, midnightProvider: walletProvider };
try {
  console.log(`Deploying ${MULTI_CONTRACT_NAME} to Preview...`);
  let deployed: any;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      deployed = await deployContract(providers as any, { compiledContract: compiled as any, args: [], privateStateId: 'nocturneLendingMultiPrivateState', initialPrivateState: {} });
      break;
    } catch (error: any) {
      const message = `${error?.message ?? ''} ${error?.cause?.message ?? ''}`;
      const transient = /disconnect|timed out|timeout|submission error|submission failed|connection reset|ECONNRESET|ECONNREFUSED/i.test(message);
      if (!transient || attempt === 5) throw error;
      const delay = attempt * 10_000;
      console.warn(`  Preview RPC submission interrupted (attempt ${attempt}/5); retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  if (!deployed) throw new Error('Experimental deployment did not complete');
  manifest = { ...manifest, contractAddress: deployed.deployTxData.public.contractAddress, deployedAt: new Date().toISOString() };
  fs.writeFileSync(manifestPath(), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Experimental contract deployed at ${manifest.contractAddress}`);
  console.log(`Deployment transaction: ${deployed.deployTxData.public.txId ?? '(not exposed)'}`);
} finally { await persistWalletState(network, walletCtx).catch(() => undefined); await walletCtx.wallet.stop().catch(() => undefined); }
