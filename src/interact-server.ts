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
import { encodeUserAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { resolveNetwork, getDeployment, getOrCreateSeed } from './network.js';
import { createWallet, persistWalletState } from './wallet.js';
import { loadMultiManifest } from './multi-config.js';

function getMultiContractAddress(network: string): string {
  const manifest = loadMultiManifest(network);
  if (!manifest.contractAddress) {
    throw new Error('Multi contract not deployed. Run npm run deploy-multi-complete first.');
  }
  return manifest.contractAddress;
}

const { TUSDC_COLOR: hex } = await import('./multi-config.js');
const TUSDC_COLOR = hexToBytes32(hex);

function hexToBytes32(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  if (clean.length !== 64) throw new Error(`Expected 64-char hex for Bytes<32>, got ${clean.length}: ${hex}`);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const { network, config: networkConfig } = resolveNetwork();

if (network === 'preview' && !process.env.MIDNIGHT_PROOF_SERVER_URL) {
  process.env.MIDNIGHT_PROOF_SERVER_URL = 'https://proof-server.preview.midnight.network';
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contract', 'managed', 'nocturne_lending_multi');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  console.error('\n❌ Multi contract not compiled! Run: cd contract && npm run compile\n');
  process.exit(1);
}

const NocturneLendingMulti = await import(pathToFileURL(contractPath).href);

interface PrivatePosition {
  tNightSupplied: bigint;
  tNightBorrowed: bigint;
  tUsdcSupplied: bigint;
  tUsdcBorrowed: bigint;
}

const deployedContract = CompiledContract.make('nocturne_lending_multi', class extends NocturneLendingMulti.Contract {
  constructor() {
    super({
      tNightSupplied: (ctx: any): [PrivatePosition, bigint] => {
        return [ctx.privateState, ctx.privateState.tNightSupplied ?? 0n];
      },
      tNightBorrowed: (ctx: any): [PrivatePosition, bigint] => {
        return [ctx.privateState, ctx.privateState.tNightBorrowed ?? 0n];
      },
      setTNightPosition: (_ctx: any, supplied: bigint, borrowed: bigint): [PrivatePosition, []] => {
        const state = { tNightSupplied: supplied, tNightBorrowed: borrowed, tUsdcSupplied: _ctx.privateState.tUsdcSupplied ?? 0n, tUsdcBorrowed: _ctx.privateState.tUsdcBorrowed ?? 0n };
        return [state, []];
      },
      tUsdcSupplied: (ctx: any): [PrivatePosition, bigint] => {
        return [ctx.privateState, ctx.privateState.tUsdcSupplied ?? 0n];
      },
      tUsdcBorrowed: (ctx: any): [PrivatePosition, bigint] => {
        return [ctx.privateState, ctx.privateState.tUsdcBorrowed ?? 0n];
      },
      setTUsdcPosition: (_ctx: any, supplied: bigint): [PrivatePosition, []] => {
        const state = { tNightSupplied: _ctx.privateState.tNightSupplied ?? 0n, tNightBorrowed: _ctx.privateState.tNightBorrowed ?? 0n, tUsdcSupplied: supplied, tUsdcBorrowed: _ctx.privateState.tUsdcBorrowed ?? 0n };
        return [state, []];
      },
      setTUsdcBorrowedPosition: (_ctx: any, borrowed: bigint): [PrivatePosition, []] => {
        const state = { tNightSupplied: _ctx.privateState.tNightSupplied ?? 0n, tNightBorrowed: _ctx.privateState.tNightBorrowed ?? 0n, tUsdcSupplied: _ctx.privateState.tUsdcSupplied ?? 0n, tUsdcBorrowed: borrowed };
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
      privateStateStoreName: 'nocturne-lending-multi-private-state',
      accountId,
      privateStoragePasswordProvider: () => process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Dev-Development-Placeholder-1',
    }),
    zkConfigProvider,
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS, WebSocket),
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

const VALID_ASSETS = ['tNight', 'tUSDC'] as const;
const VALID_ACTIONS = ['supply', 'withdraw', 'borrow', 'repay', 'supply_tusdc', 'withdraw_tusdc', 'borrow_tusdc', 'repay_tusdc'] as const;

type Asset = typeof VALID_ASSETS[number];
type Action = typeof VALID_ACTIONS[number];

const ACTION_TO_CIRCUIT: Record<string, Record<Asset, string>> = {
  supply: { tNight: 'supply', tUSDC: 'supply_tusdc' },
  withdraw: { tNight: 'withdraw', tUSDC: 'withdraw_tusdc' },
  borrow: { tNight: 'borrow', tUSDC: 'borrow_tusdc' },
  repay: { tNight: 'repay', tUSDC: 'repay_tusdc' },
};

function isPrivatePosition(value: unknown): value is PrivatePosition {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return ['tNightSupplied', 'tNightBorrowed', 'tUsdcSupplied', 'tUsdcBorrowed']
    .every((key) => typeof state[key] === 'bigint');
}

function getInitialPosition(): PrivatePosition {
  return { tNightSupplied: 0n, tNightBorrowed: 0n, tUsdcSupplied: 0n, tUsdcBorrowed: 0n };
}

async function handleProveRequest(providers: any, action: Action, asset: Asset, amountStr: string, accountId: string, unshieldedAddress: string): Promise<{ success: true; provenTx: string; pendingId: string } | { error: string }> {
  try {
    const trimmed = amountStr.trim();
    if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
      return { error: 'Amount must be a number with up to 6 decimals' };
    }
    const [whole, fraction = ''] = trimmed.split('.');
    const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0') || '0');
    if (amount <= 0n) {
      return { error: 'Amount must be greater than 0' };
    }

    const contractAddress = getMultiContractAddress(network);
    if (!contractAddress) {
      return { error: `No deploy on file for network ${network}. Run npm run deploy first.` };
    }

    providers.privateStateProvider.setContractAddress(contractAddress);
    const savedState = await providers.privateStateProvider.get('nocturneLendingMultiPrivateState');
    const position = isPrivatePosition(savedState) ? savedState : getInitialPosition();
    if (!isPrivatePosition(savedState)) {
      await providers.privateStateProvider.set('nocturneLendingMultiPrivateState', position);
    }

    const circuitId = ACTION_TO_CIRCUIT[action]?.[asset];
    if (!circuitId) {
      return { error: `Unsupported action/asset combination: ${action}/${asset}` };
    }

    const decodedUnshielded = MidnightBech32m.parse(unshieldedAddress).decode(UnshieldedAddress, network);
    const recipient = { bytes: encodeUserAddress(decodedUnshielded.hexString) };

    let args: unknown[];
    if (circuitId === 'supply_tusdc') {
      args = [TUSDC_COLOR, amount];
    } else if (circuitId === 'withdraw_tusdc') {
      args = [recipient, TUSDC_COLOR, amount];
    } else {
      args = [amount];
    }

    const callOptions = {
      compiledContract: deployedContract as any,
      contractAddress: contractAddress,
      privateStateId: 'nocturneLendingMultiPrivateState',
      circuitId,
      args,
    };

    console.log(`[${new Date().toISOString()}] Proving ${action} ${asset} for amount ${amount}`);
    const unprovenTx = await createUnprovenCallTx(providers, callOptions);
    const provenTx = await providers.proofProvider.proveTx(unprovenTx.private.unprovenTx);

    const serialized = provenTx.serialize();
    const txHex = Buffer.from(serialized).toString('hex');

    console.log(`[${new Date().toISOString()}] Prove succeeded for ${action} ${asset}, tx length: ${txHex.length}`);

    const pendingId = randomUUID();
    pendingPrivateStates.set(pendingId, {
      accountId,
      contractAddress: contractAddress,
      state: unprovenTx.private.nextPrivateState as unknown as PrivatePosition,
      expiresAt: Date.now() + PENDING_STATE_TTL_MS,
    });
    return { success: true, provenTx: txHex, pendingId };
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Prove error:`, err?.stack || err?.message || err);
    if (err?.cause) console.error('  Cause:', err.cause?.stack || err.cause?.message || err.cause);
    return { error: err.message || 'Proving failed' };
  }
}

const pendingPrivateStates = new Map<string, { accountId: string; contractAddress: string; state: PrivatePosition; expiresAt: number }>();
const PENDING_STATE_TTL_MS = 30 * 60 * 1000;

async function main() {
  setNetworkId(network);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Nocturne Finance Proof Server (${network})`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const contractAddress = getMultiContractAddress(network);
  console.log(`  Contract Address: ${contractAddress}\n`);

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
        contractAddress: getMultiContractAddress(network),
      }));
      return;
    }

    if (req.method === 'GET' && req.url?.startsWith('/api/wallet/balance')) {
      try {
        const accountId = new URL(req.url, 'http://localhost').searchParams.get('accountId');
        if (!accountId || accountId.length > 512) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'A valid accountId is required' }));
          return;
        }

        const query = `query GetUnshieldedBalances($address: HexEncoded!) {
          unshieldedBalances(address: $address) {
            tokenColor
            amount
          }
        }`;

        const response = await fetch(networkConfig.indexer, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { address: accountId } }),
        });

        const result = await response.json() as { data?: { unshieldedBalances?: Array<{ tokenColor: string; amount: string }> }; errors?: Array<{ message?: string }> };
        if (result.errors?.length) {
          throw new Error(result.errors[0]?.message || 'Indexer query failed');
        }

        const balances = (result.data?.unshieldedBalances ?? []).map((b) => ({
          tokenColor: b.tokenColor,
          amount: b.amount,
        }));

        res.writeHead(200);
        res.end(JSON.stringify({ balances }));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message || 'Could not read wallet balance' }));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/api/claim-tusdc') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const { accountId, unshieldedAddress } = parsed;

          if (!accountId || !unshieldedAddress) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'accountId and unshieldedAddress are required' }));
            return;
          }

          const tokenStatePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.midnight-token-state.json');
          if (!fs.existsSync(tokenStatePath)) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Test token not deployed. Run npm run deploy-token first.' }));
            return;
          }
          const tokenState = JSON.parse(fs.readFileSync(tokenStatePath, 'utf8')) as { address: string; faucetAmountBaseUnits: string };

          const zkPath = path.resolve(__dirname, '..', 'contract', 'managed', 'nocturne_test_token');
          const contractPath = path.join(zkPath, 'contract', 'index.js');
          if (!fs.existsSync(contractPath)) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Test token artifacts missing. Run npm run compile.' }));
            return;
          }
          const TestToken = await import(pathToFileURL(contractPath).href);
          const testTokenContract = CompiledContract.make('nocturne-test-token', class extends TestToken.Contract { constructor() { super({}); } } as any)
            .pipe(CompiledContract.withCompiledFileAssets(zkPath));

          const walletCtx = await createWallet({ network, networkConfig, seed: getOrCreateSeed(network) });
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
            privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: 'nocturne-test-token-state', accountId, privateStoragePasswordProvider: () => process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Dev-Development-Placeholder-1' }),
            publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS, WebSocket as any),
            zkConfigProvider: new NodeZkConfigProvider(zkPath),
            proofProvider: httpClientProofProvider(networkConfig.proofServer, new NodeZkConfigProvider(zkPath)),
            walletProvider,
            midnightProvider: walletProvider,
          };

          const deployed: any = await findDeployedContract(providers as any, { compiledContract: testTokenContract as any, contractAddress: tokenState.address, privateStateId: 'nocturneTestTokenPrivateState', initialPrivateState: {} });
          const decoded = MidnightBech32m.parse(unshieldedAddress).decode(UnshieldedAddress, network);
          const recipient = { bytes: encodeUserAddress(decoded.hexString) };

          let result: any;
          for (let attempt = 1; attempt <= 5; attempt++) {
            try {
              result = await deployed.callTx.claim(recipient);
              break;
            } catch (error: any) {
              const message = `${error?.message ?? ''} ${error?.cause?.message ?? ''}`;
              const transient = /disconnect|timed out|timeout|submission error|submission failed|connection reset|ECONNRESET|ECONNREFUSED/i.test(message);
              if (!transient || attempt === 5) throw error;
              const delayMs = attempt * 10_000;
              console.warn(`  Claim RPC interrupted (attempt ${attempt}/5); retrying in ${delayMs / 1000}s...`);
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          }

          if (!result) throw new Error('Faucet claim did not complete');
          console.log(`[${new Date().toISOString()}] tUSDC claimed for ${accountId}: ${result.public.txId}`);

          res.writeHead(200);
          res.end(JSON.stringify({ success: true, txId: result.public.txId, amount: tokenState.faucetAmountBaseUnits }));
        } catch (err: any) {
          console.error(`[${new Date().toISOString()}] Claim error:`, err?.message || err);
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message || 'Claim failed' }));
        } finally {
          // No wallet state to persist for this ephemeral claim flow
        }
      });
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
        const contractAddress = getMultiContractAddress(network);
        const providers = await createProviders('', '', accountId);
        providers.privateStateProvider.setContractAddress(contractAddress);
        const savedState = await providers.privateStateProvider.get('nocturneLendingMultiPrivateState');
        const position = isPrivatePosition(savedState) ? savedState : null;
        res.writeHead(200);
        res.end(JSON.stringify({
          position: position ? {
            tNightSupplied: position.tNightSupplied.toString(),
            tNightBorrowed: position.tNightBorrowed.toString(),
            tUsdcSupplied: position.tUsdcSupplied.toString(),
            tUsdcBorrowed: position.tUsdcBorrowed.toString(),
          } : null,
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
          const { action, asset, amount, coinPublicKey, encryptionPublicKey, accountId, unshieldedAddress } = parsed;

          if (!action || !VALID_ACTIONS.includes(action as Action)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }));
            return;
          }

          if (!asset || !VALID_ASSETS.includes(asset)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Invalid asset. Must be one of: ${VALID_ASSETS.join(', ')}` }));
            return;
          }

          if (!coinPublicKey || !encryptionPublicKey || !accountId || typeof unshieldedAddress !== 'string') {
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
          const result = await handleProveRequest(providers, action as Action, asset, amount, accountId, unshieldedAddress);

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
          await providers.privateStateProvider.set('nocturneLendingMultiPrivateState', pending.state);
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
