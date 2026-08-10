# Deployment Guide

## Prerequisites

- Node.js >= 22.0.0
- Docker Desktop (for local devnet)
- Midnight proof server (Docker container)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the local Midnight devnet

```bash
docker compose up -d
```

This starts three services:
- `nocturne-finance-node` — Midnight node (port 9944)
- `nocturne-finance-indexer` — Indexer (port 8088)
- `nocturne-finance-proof-server` — Proof server (port 6300)

Verify they're running:
```bash
docker compose ps
```

### 3. Compile the contract

```bash
cd contract
npm install
npm test
```

The `npm test` command runs the local circuit tests. The contract is already compiled to `contract/managed/nocturne_lending/`.

### 4. Run setup (wallet + DUST)

```bash
npm run setup
```

This creates a local wallet, syncs with the network, and registers for DUST tokens.

### 5. Deploy

```bash
npm run deploy
```

This deploys the `nocturne_lending` contract to the configured network.

### 6. Check balance / interact

```bash
npm run cli
```

## Networks

Switch networks with the `--network` flag:

```bash
npm run setup -- --network preview
npm run deploy -- --network preview
```

Supported networks:
- `undeployed` (default) — local devnet via Docker
- `preview` — Midnight Preview network
- `preprod` — Midnight PreProd network

For public networks, fund your wallet from the faucet:
- Preview: https://midnight-tmnight-preview.nethermind.dev
- PreProd: https://midnight-tmnight-preprod.nethermind.dev

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MIDNIGHT_INDEXER_URL` | Override indexer URL |
| `MIDNIGHT_INDEXER_WS_URL` | Override indexer WebSocket URL |
| `MIDNIGHT_NODE_URL` | Override node URL |
| `MIDNIGHT_FAUCET_URL` | Override faucet URL |
| `MIDNIGHT_PROOF_SERVER_URL` | Override proof server URL |
| `MIDNIGHT_WALLET_SEED` | Override wallet seed |
| `PRIVATE_STATE_PASSWORD` | Private state encryption password (min 16 chars for non-local networks) |
| `MIDNIGHT_FAUCET_TIMEOUT_MS` | Faucet wait timeout in ms (default: 600000) |

## State Files

- `.midnight-state.json` — Network config, wallet seeds, deployment records
- `.midnight-wallet-state` — Wallet sync state

Both are gitignored. To reset:
```bash
npm run clean
```

## Troubleshooting

### Proof server not responding
```bash
docker compose ps
docker compose logs proof-server
```

### Wallet has zero NIGHT (local devnet)
```bash
docker compose down -v
docker compose up -d
npm run clean
npm run setup
```

### Faucet stalls (public networks)
This is a known issue. The deploy script retries automatically for up to 100 seconds. If it times out:
1. Visit the faucet URL manually
2. Re-run `npm run deploy`

### Contract not compiled
```bash
cd contract
npm install
npm test
```

## Current Status

- [x] Contract circuits compiled and tested locally
- [x] Deposit, withdraw, borrow, repay, accrue_interest circuits implemented
- [x] Deployed to local devnet (`undeployed`)
- [x] Contract Address: `a98cbf92f28704c4899b86d64940fec52a304774ed54113d157ec4803006ea83`
- [ ] Deployed to Preview/PreProd (requires funded wallet + accessible proof server)
- [ ] Frontend wired to live contract

## Notes

### Duplicate wasm module fix

If deployment fails with `expected instance of ContractMaintenanceAuthority`, remove the duplicate `onchain-runtime-v3` from the contract's `node_modules`:

```bash
rm -rf contract/node_modules/@midnight-ntwrk/onchain-runtime-v3
```

This ensures the contract's generated code and the deploy script share the same wasm class instances.
