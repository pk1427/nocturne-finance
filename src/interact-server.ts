import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';

import { findDeployedContract, createUnprovenCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { resolveNetwork, getOrCreateSeed, getDeployment } from './network';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'nocturneLendingPrivateState';
const PRIVATE_STATE_PASSWORD = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';

const { network, config: networkConfig } = resolveNetwork();

if (network === 'preview' && !process.env.MIDNIGHT_PROOF_SERVER_URL) {
  process.env.MIDNIGHT_PROOF_SERVER_URL = 'https://proof-server.preview.midnight.network';
}
const SEED = getOrCreateSeed(network);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contract', 'managed', 'nocturne_lending');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  console.error('\n❌ Contract not compiled! Run: npm run compile\n');
  process.exit(1);
}

const NocturneLending = await import(pathToFileURL(contractPath).href);

const deployedContract = CompiledContract.make('nocturne-lending', class extends NocturneLending.Contract {
  constructor() {
    super({
      userSupplied: (_ctx: any): [any, bigint] => {
        const state = { userSupplied: 0n, userBorrowed: 0n, userLastSupplyIndex: 1n, userLastBorrowIndex: 1n };
        return [state, state.userSupplied];
      },
      userBorrowed: (_ctx: any): [any, bigint] => {
        const state = { userSupplied: 0n, userBorrowed: 0n, userLastSupplyIndex: 1n, userLastBorrowIndex: 1n };
        return [state, state.userBorrowed];
      },
      userLastSupplyIndex: (_ctx: any): [any, bigint] => {
        const state = { userSupplied: 0n, userBorrowed: 0n, userLastSupplyIndex: 1n, userLastBorrowIndex: 1n };
        return [state, state.userLastSupplyIndex];
      },
      userLastBorrowIndex: (_ctx: any): [any, bigint] => {
        const state = { userSupplied: 0n, userBorrowed: 0n, userLastSupplyIndex: 1n, userLastBorrowIndex: 1n };
        return [state, state.userLastBorrowIndex];
      },
      setUserPosition: (_ctx: any, newSupplied: bigint, newBorrowed: bigint, newLastSupplyIndex: bigint, newLastBorrowIndex: bigint): [any, []] => {
        const state = { userSupplied: newSupplied, userBorrowed: newBorrowed, userLastSupplyIndex: newLastSupplyIndex, userLastBorrowIndex: newLastBorrowIndex };
        return [state, []];
      },
    });
  }
}).pipe(
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

async function createProviders(walletCtx: WalletContext) {
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
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'nocturne-lending-state',
      accountId,
      privateStoragePasswordProvider: () => PRIVATE_STATE_PASSWORD,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

const VALID_ACTIONS = ['deposit', 'withdraw', 'borrow', 'repay'] as const;
type Action = typeof VALID_ACTIONS[number];

function parseAmount(raw: string): bigint {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error('Amount must be a non-negative integer string');
  }
  return BigInt(trimmed);
}

async function handleContractCall(providers: any, action: Action, amountStr: string): Promise<{ success: true; txHash: string } | { error: string }> {
  try {
    const amount = parseAmount(amountStr);
    if (amount <= 0n) {
      return { error: 'Amount must be greater than 0' };
    }

    const deployment = getDeployment(network);
    if (!deployment) {
      return { error: `No deploy on file for network ${network}. Run npm run deploy first.` };
    }

    providers.privateStateProvider.setContractAddress(deployment.address);
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, {
      userSupplied: 0n,
      userBorrowed: 0n,
      userLastSupplyIndex: 1n,
      userLastBorrowIndex: 1n,
    });

    const callOptions = {
      compiledContract: deployedContract as any,
      contractAddress: deployment.address,
      privateStateId: PRIVATE_STATE_ID,
      circuitId: action,
      args: [amount, 0n, 0n],
    };

    const unprovenTx = await createUnprovenCallTx(providers, callOptions);
    const provenTx = await providers.proofProvider.proveTx(unprovenTx.private.unprovenTx);
    const ttl = new Date(Date.now() + 30 * 60 * 1000);
    const balancedTx = await providers.walletProvider.balanceTx(provenTx, ttl);
    const txHash = await providers.walletProvider.submitTx(balancedTx);
    await providers.privateStateProvider.set(PRIVATE_STATE_ID, unprovenTx.private.nextPrivateState);

    return { success: true, txHash };
  } catch (err: any) {
    console.error('Full error:', err);
    console.error('Error stack:', err.stack);
    const debug = err?.debug || err?.cause?.debug || null;
    const message = debug ? (debug.error || debug.message || 'Transaction failed') : (err.message || 'Transaction failed');
    return { error: message };
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Nocturne Finance Interact Server (${network})`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const seed = SEED;

  console.log('─── Wallet setup ───────────────────────────────────────────────\n');
  console.log('  Creating wallet...');
  const walletCtx = await createWallet({ network, networkConfig, seed });
  const restoredCount = Object.values(walletCtx.restored).filter(Boolean).length;
  if (restoredCount > 0) {
    console.log(`  Restored ${restoredCount}/3 child wallets from .midnight-wallet-state`);
  }

  console.log('  Syncing with network...');
  console.log('  ℹ  This may take several minutes depending on network size.');
  console.log('     RPC disconnection messages during sync are normal and can be safely ignored.\n');
  const syncStart = Date.now();
  const syncInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - syncStart) / 1000);
    process.stdout.write(`\r  ⏳ Still syncing... (${elapsed}s elapsed)   `);
  }, 5000);
  const state = await walletCtx.wallet.waitForSyncedState();
  clearInterval(syncInterval);
  process.stdout.write('\r  ✓ Synced with network.                                      \n');

  await persistWalletState(network, walletCtx);

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`\n  Wallet Address: ${address}`);
  console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

  const providers = await createProviders(walletCtx);

  const deployment = getDeployment(network);
  if (deployment) {
    console.log(`  Contract Address: ${deployment.address}\n`);
  } else {
    console.log(`  ⚠ No deployment found for network ${network}\n`);
  }

  const port = parseInt(process.env.INTERACT_SERVER_PORT || '6301', 10);

  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/api/wallet') {
      const deployment = getDeployment(network);
      res.writeHead(200);
      res.end(JSON.stringify({
        address: walletCtx.unshieldedKeystore.getBech32Address().toString(),
        network,
        contractAddress: deployment?.address ?? null,
      }));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/contract/preview') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const { action, amount } = parsed;

          if (!action || !VALID_ACTIONS.includes(action)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }));
            return;
          }

          if (typeof amount !== 'string') {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Amount must be a string' }));
            return;
          }

          const deployment = getDeployment(network);
          if (!deployment) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: `No deploy on file for network ${network}` }));
            return;
          }

          res.writeHead(200);
          res.end(JSON.stringify({
            action,
            amount,
            network,
            contractAddress: deployment.address,
            walletAddress: walletCtx.unshieldedKeystore.getBech32Address().toString(),
            estimatedFee: '1 SPECK',
          }));
        } catch (err: any) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: `Invalid JSON: ${err.message}` }));
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/contract/prove') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const { action, amount } = parsed;

          if (!action || !VALID_ACTIONS.includes(action)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }));
            return;
          }

          if (typeof amount !== 'string') {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Amount must be a string' }));
            return;
          }

          const deployment = getDeployment(network);
          if (!deployment) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: `No deploy on file for network ${network}` }));
            return;
          }

          providers.privateStateProvider.setContractAddress(deployment.address);
          await providers.privateStateProvider.set(PRIVATE_STATE_ID, {
            userSupplied: 0n,
            userBorrowed: 0n,
            userLastSupplyIndex: 1n,
            userLastBorrowIndex: 1n,
          });

          const callOptions = {
            compiledContract: deployedContract as any,
            contractAddress: deployment.address,
            privateStateId: PRIVATE_STATE_ID,
            circuitId: action,
            args: [BigInt(amount), 0n, 0n],
          };

          console.log(`[${new Date().toISOString()}] Proving ${action} for amount ${amount}`);
          const unprovenTx = await createUnprovenCallTx(providers, callOptions);
          const provenTx = await providers.proofProvider.proveTx(unprovenTx.private.unprovenTx);

          console.log(`[${new Date().toISOString()}] Prove succeeded for ${action}`);

          res.writeHead(200);
          res.end(JSON.stringify({
            action,
            amount,
            provenTx,
            nextPrivateState: unprovenTx.private.nextPrivateState,
          }));
        } catch (err: any) {
          console.error(`[${new Date().toISOString()}] Prove error:`, err.message);
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message || 'Proving failed' }));
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/contract/submit') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const { action, amount, signedTx } = parsed;

          if (!action || !VALID_ACTIONS.includes(action)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }));
            return;
          }

          if (typeof amount !== 'string') {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Amount must be a string' }));
            return;
          }

          const deployment = getDeployment(network);
          if (!deployment) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: `No deploy on file for network ${network}` }));
            return;
          }

          console.log(`[${new Date().toISOString()}] Submitting ${action} for amount ${amount}`);

          const unprovenTx = await createUnprovenCallTx(providers, {
            compiledContract: deployedContract as any,
            contractAddress: deployment.address,
            privateStateId: PRIVATE_STATE_ID,
            circuitId: action,
            args: [BigInt(amount), 0n, 0n],
          });

          const provenTx = await providers.proofProvider.proveTx(unprovenTx.private.unprovenTx);
          const ttl = new Date(Date.now() + 30 * 60 * 1000);
          const balancedTx = await providers.walletProvider.balanceTx(provenTx, ttl);
          const txHash = await providers.walletProvider.submitTx(balancedTx);

          await providers.privateStateProvider.set(PRIVATE_STATE_ID, unprovenTx.private.nextPrivateState);

          console.log(`[${new Date().toISOString()}] ${action} succeeded: txHash=${txHash}`);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, txHash }));
        } catch (err: any) {
          console.error(`[${new Date().toISOString()}] Submit error:`, err.message);
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message || 'Submission failed' }));
        }
      });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/api/contract') {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found. Use POST /api/contract' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const { action, amount } = parsed;

        if (!action || !VALID_ACTIONS.includes(action)) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }));
          return;
        }

        if (typeof amount !== 'string') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Amount must be a string' }));
          return;
        }

        console.log(`[${new Date().toISOString()}] Received ${action} request for amount ${amount}`);
        const result = await handleContractCall(providers, action as Action, amount);

        if ('error' in result) {
          console.log(`[${new Date().toISOString()}] ${action} failed: ${result.error}`);
          res.writeHead(500);
          res.end(JSON.stringify(result));
        } else {
          console.log(`[${new Date().toISOString()}] ${action} succeeded: txHash=${result.txHash}`);
          res.writeHead(200);
          res.end(JSON.stringify(result));
        }
      } catch (err: any) {
        console.error(`[${new Date().toISOString()}] Parse error:`, err.message);
        res.writeHead(400);
        res.end(JSON.stringify({ error: `Invalid JSON: ${err.message}` }));
      }
    });
  });

  server.listen(port, () => {
    console.log(`  Server running on http://localhost:${port}`);
    console.log('  Press Ctrl+C to stop\n');
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n\n  Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      try {
        await persistWalletState(network, walletCtx);
        await walletCtx.wallet.stop();
        console.log('  Wallet state saved and stopped.\n');
      } catch (err) {
        console.error('  Error during shutdown:', err);
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
