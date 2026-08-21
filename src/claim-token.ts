/** Claim the one-time, testnet-only tUSDC faucet allocation. */
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
import { encodeUserAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { resolveNetwork, getDeployment, getOrCreateSeed } from './network.js';
import { createWallet, persistWalletState } from './wallet.js';

// @ts-expect-error Required by Midnight indexer subscriptions in Node.
globalThis.WebSocket = WebSocket;

const { network, config } = resolveNetwork();
if (network !== 'preview') throw new Error('The tUSDC faucet is testnet-only and can only run on --network preview.');
const statePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.midnight-token-state.json');
if (!fs.existsSync(statePath)) throw new Error('Missing .midnight-token-state.json; deploy the token first.');
const tokenState = JSON.parse(fs.readFileSync(statePath, 'utf8')) as { address: string; faucetAmountBaseUnits: string };
const root = path.dirname(fileURLToPath(import.meta.url));
const zkPath = path.resolve(root, '..', 'contract', 'managed', 'nocturne_test_token');
const generated = await import(pathToFileURL(path.join(zkPath, 'contract', 'index.js')).href);
const contract = CompiledContract.make('nocturne-test-token', class extends generated.Contract { constructor() { super({}); } } as any)
  .pipe(CompiledContract.withCompiledFileAssets(zkPath));

const walletCtx = await createWallet({ network, networkConfig: config, seed: getOrCreateSeed(network) });
await walletCtx.wallet.waitForSyncedState();
const walletProvider = {
  getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
  getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
  async balanceTx(tx: any, ttl?: Date) {
    const recipe = await walletCtx.wallet.balanceUnboundTransaction(tx, { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey }, { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) });
    return walletCtx.wallet.finalizeRecipe(recipe);
  },
  submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx),
};
const providers = {
  privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: 'nocturne-test-token-state', accountId: walletCtx.unshieldedKeystore.getBech32Address().toString(), privateStoragePasswordProvider: () => process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Dev-Development-Placeholder-1' }),
  publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS, WebSocket as any),
  zkConfigProvider: new NodeZkConfigProvider(zkPath),
  proofProvider: httpClientProofProvider(config.proofServer, new NodeZkConfigProvider(zkPath)),
  walletProvider,
  midnightProvider: walletProvider,
};
try {
  const deployed: any = await findDeployedContract(providers as any, { compiledContract: contract as any, contractAddress: tokenState.address, privateStateId: 'nocturneTestTokenPrivateState', initialPrivateState: {} });
  const address = walletCtx.unshieldedKeystore.getBech32Address().toString();
  const decoded = MidnightBech32m.parse(address).decode(UnshieldedAddress, network);
  const recipient = { bytes: encodeUserAddress(decoded.hexString) };
  let result: any;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      result = await deployed.callTx.claim(recipient);
      break;
    } catch (error: any) {
      const message = `${error?.message ?? ''} ${error?.cause?.message ?? ''}`;
      const transient = /disconnect|timed out|timeout|submission error|submission failed|connection reset|ECONNRESET|ECONNREFUSED/i.test(message);
      if (!transient || attempt === 5) throw error;
      const delayMs = attempt * 10_000;
      console.warn(`  Preview RPC submission interrupted (attempt ${attempt}/5); retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  if (!result) throw new Error('Faucet claim did not complete');
  console.log(`Claim submitted: ${result.public.txId}`);
  console.log(`Recipient: ${walletCtx.unshieldedKeystore.getBech32Address()}`);
  console.log(`Amount: ${tokenState.faucetAmountBaseUnits} base units (one claim per wallet)`);
} finally {
  await persistWalletState(network, walletCtx).catch(() => undefined);
  await walletCtx.wallet.stop().catch(() => undefined);
}
