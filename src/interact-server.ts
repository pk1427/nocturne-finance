import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';

import { findDeployedContract, createUnprovenCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { resolveNetwork, getDeployment } from './network';
import { INITIAL_INDEX, newUserPosition, rescaleArguments } from '../contract/src/reserve-config.js';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'nocturneLendingPrivateState';
const PRIVATE_STATE_PASSWORD = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';

const { network, config: networkConfig } = resolveNetwork();

if (network === 'preview' && !process.env.MIDNIGHT_PROOF_SERVER_URL) {
  process.env.MIDNIGHT_PROOF_SERVER_URL = 'https://proof-server.preview.midnight.network';
}

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
      userSupplied: (ctx: any): [UserPosition, bigint] => {
        return [ctx.privateState, ctx.privateState.userSupplied];
      },
      userBorrowed: (ctx: any): [UserPosition, bigint] => {
        return [ctx.privateState, ctx.privateState.userBorrowed];
      },
      userLastSupplyIndex: (ctx: any): [UserPosition, bigint] => {
        return [ctx.privateState, ctx.privateState.userLastSupplyIndex];
      },
      userLastBorrowIndex: (ctx: any): [UserPosition, bigint] => {
        return [ctx.privateState, ctx.privateState.userLastBorrowIndex];
      },
      setUserPosition: (_ctx: any, newSupplied: bigint, newBorrowed: bigint, newLastSupplyIndex: bigint, newLastBorrowIndex: bigint): [UserPosition, []] => {
        const state = { userSupplied: newSupplied, userBorrowed: newBorrowed, userLastSupplyIndex: newLastSupplyIndex, userLastBorrowIndex: newLastBorrowIndex };
        return [state, []];
      },
    });
  }
}).pipe(
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

async function createProviders(coinPublicKey: string, encryptionPublicKey: string, accountId: string) {
  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'nocturne-lending-state',
      accountId,
      privateStoragePasswordProvider: () => PRIVATE_STATE_PASSWORD,
    }),
    zkConfigProvider,
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS, WebSocket),
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

const VALID_ACTIONS = ['deposit', 'withdraw', 'borrow', 'repay'] as const;
type Action = typeof VALID_ACTIONS[number];
type UserPosition = ReturnType<typeof newUserPosition>;

// A proof must not update private state until Lace has balanced and submitted
// it. This in-memory hand-off intentionally expires; a failed/cancelled wallet
// prompt therefore leaves the previous position intact.
const pendingPrivateStates = new Map<string, { accountId: string; contractAddress: string; state: UserPosition; expiresAt: number }>();
const PENDING_STATE_TTL_MS = 30 * 60 * 1000;

function parseAmount(raw: string): bigint {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error('Amount must be a non-negative integer string');
  }
  return BigInt(trimmed);
}

function isUserPosition(value: unknown): value is UserPosition {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return ['userSupplied', 'userBorrowed', 'userLastSupplyIndex', 'userLastBorrowIndex']
    .every((key) => typeof state[key] === 'bigint');
}

async function handleProveRequest(providers: any, action: Action, amountStr: string, accountId: string): Promise<{ success: true; provenTx: string; pendingId: string } | { error: string }> {
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
    const savedState = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
    const position = isUserPosition(savedState) ? savedState : newUserPosition();
    if (!isUserPosition(savedState)) {
      await providers.privateStateProvider.set(PRIVATE_STATE_ID, position);
    }

    const storedBalance = action === 'deposit' || action === 'withdraw'
      ? position.userSupplied
      : position.userBorrowed;
    const lastIndex = action === 'deposit' || action === 'withdraw'
      ? position.userLastSupplyIndex
      : position.userLastBorrowIndex;
    const { quotient, remainder } = rescaleArguments(storedBalance, INITIAL_INDEX, lastIndex);

    const callOptions = {
      compiledContract: deployedContract as any,
      contractAddress: deployment.address,
      privateStateId: PRIVATE_STATE_ID,
      circuitId: action,
      args: [amount, quotient, remainder],
    };

    console.log(`[${new Date().toISOString()}] Proving ${action} for amount ${amount}`);
    const unprovenTx = await createUnprovenCallTx(providers, callOptions);
    const provenTx = await providers.proofProvider.proveTx(unprovenTx.private.unprovenTx);

    const serialized = provenTx.serialize();
    const txHex = Buffer.from(serialized).toString('hex');

    console.log(`[${new Date().toISOString()}] Prove succeeded for ${action}, tx length: ${txHex.length}`);

    const pendingId = randomUUID();
    pendingPrivateStates.set(pendingId, {
      accountId,
      contractAddress: deployment.address,
      state: unprovenTx.private.nextPrivateState as unknown as UserPosition,
      expiresAt: Date.now() + PENDING_STATE_TTL_MS,
    });
    return { success: true, provenTx: txHex, pendingId };
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Prove error:`, err.message);
    return { error: err.message || 'Proving failed' };
  }
}

async function main() {
  setNetworkId(network);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Nocturne Finance Proof Server (${network})`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/api/contract-info') {
      res.writeHead(200);
      res.end(JSON.stringify({
        network,
        contractAddress: deployment?.address ?? null,
      }));
      return;
    }

    if (req.method === 'GET' && req.url?.startsWith('/api/contract/position')) {
      try {
        const accountId = new URL(req.url, 'http://localhost').searchParams.get('accountId');
        if (!accountId || accountId.length > 512) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'A valid accountId is required' }));
          return;
        }
        const deployment = getDeployment(network);
        if (!deployment) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: `No deploy on file for network ${network}.` }));
          return;
        }

        const providers = await createProviders('', '', accountId);
        providers.privateStateProvider.setContractAddress(deployment.address);
        const savedState = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
        const position = isUserPosition(savedState) ? savedState : null;
        res.writeHead(200);
        res.end(JSON.stringify({
          position: position && {
            userSupplied: position.userSupplied.toString(),
            userBorrowed: position.userBorrowed.toString(),
            userLastSupplyIndex: position.userLastSupplyIndex.toString(),
            userLastBorrowIndex: position.userLastBorrowIndex.toString(),
          },
        }));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message || 'Could not read private position' }));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/api/contract/prove') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const { action, amount, coinPublicKey, encryptionPublicKey, accountId } = parsed;

          if (!action || !VALID_ACTIONS.includes(action)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }));
            return;
          }

          if (!coinPublicKey || !encryptionPublicKey || !accountId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'coinPublicKey, encryptionPublicKey, and accountId are required' }));
            return;
          }

          if (typeof amount !== 'string') {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Amount must be a string' }));
            return;
          }

          const providers = await createProviders(coinPublicKey, encryptionPublicKey, accountId);
          const result = await handleProveRequest(providers, action as Action, amount, accountId);

          if ('error' in result) {
            res.writeHead(500);
            res.end(JSON.stringify(result));
          } else {
            res.writeHead(200);
            res.end(JSON.stringify(result));
          }
        } catch (err: any) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: `Invalid JSON: ${err.message}` }));
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/contract/commit') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const { pendingId, accountId, txHash } = JSON.parse(body);
          const pending = typeof pendingId === 'string' ? pendingPrivateStates.get(pendingId) : undefined;
          if (!pending || pending.expiresAt < Date.now()) {
            if (typeof pendingId === 'string') pendingPrivateStates.delete(pendingId);
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Unknown or expired pending transaction' }));
            return;
          }
          if (pending.accountId !== accountId || typeof txHash !== 'string' || txHash.length === 0) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Pending transaction does not match the submitting account' }));
            return;
          }

          const providers = await createProviders('', '', accountId);
          providers.privateStateProvider.setContractAddress(pending.contractAddress);
          await providers.privateStateProvider.set(PRIVATE_STATE_ID, pending.state);
          pendingPrivateStates.delete(pendingId);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
        } catch (err: any) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: `Invalid commit request: ${err.message}` }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found. Use POST /api/contract/prove, POST /api/contract/commit, or GET /api/contract/position' }));
  });

  server.listen(port, () => {
    console.log(`  Proof server running on http://localhost:${port}\n`);
  });

  process.on('SIGINT', () => {
    console.log('\n\n  Received SIGINT, shutting down gracefully...\n');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n\n  Received SIGTERM, shutting down gracefully...\n');
    server.close(() => {
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
