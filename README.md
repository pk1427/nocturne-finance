# Nocturne Finance

Nocturne Finance is a privacy-preserving lending-accounting MVP for Midnight. It demonstrates a confidential, witness-managed user position alongside public pool totals, using one fixed reserve configuration on Midnight Preview.

> Status: working Preview demonstration. This is a hackathon MVP, not a production lending protocol.

## Live Preview deployment

- Network: Midnight Preview
- Contract: [`488ce5c9493f4a17961af8b2d4b3de1be99223dedf5db6e273049298fd2c2938`](https://explorer.preview.midnight.network/contracts/488ce5c9493f4a17961af8b2d4b3de1be99223dedf5db6e273049298fd2c2938)
- Reserve initialization: verified on-chain
- Supply index: `1,000,000`
- Borrow index: `1,000,000`

## What works

- One-time reserve initialization on Preview.
- Real server-side proof generation and Lace wallet balancing/submission.
- Sequential, persisted private positions per shielded wallet.
- Deposit, withdraw, borrow, and repay circuits.
- Dashboard showing public pool totals and the connected wallet's persisted confidential position.

The following Preview sequence was completed without resetting private state:

| Operation | Amount | Pool supplied | Pool borrowed |
| --- | ---: | ---: | ---: |
| Deposit | 22 | 22 | 0 |
| Deposit | 10 | 32 | 0 |
| Withdraw | 8 | 24 | 0 |
| Borrow | 5 | 24 | 5 |
| Repay | 5 | 24 | 0 |

## Important: what the amounts mean

The lending amounts are **protocol accounting units** in a single virtual reserve. They are not tNIGHT, tDUST, or a transferable mock token. The current MVP updates:

- public `totalSupplied` and `totalBorrowed` ledger values; and
- each user's private supplied/borrowed witness state.

`tDUST` is separate. It is Midnight's non-transferable transaction-fee resource and Lace spends it to balance and submit calls. `tNIGHT` backs DUST generation, but is not deposited into this pool.

## Fixed reserve configuration

The pre-oracle MVP uses one hardcoded configuration, defined in [`contract/src/reserve-config.ts`](contract/src/reserve-config.ts) and mirrored in the Compact initialization circuit.

| Parameter | Value |
| --- | ---: |
| Initial supply index | `1,000,000` |
| Initial borrow index | `1,000,000` |
| Collateral factor | `7,500` bps (75%) |
| Base rate | `100` bps |
| Slope 1 | `900` bps |
| Slope 2 | `4,000` bps |
| Kink | `8,000` bps (80%) |
| Reserve factor | `1,000` bps (10%) |
| Liquidation threshold | `8,000` bps (80%) |

## Run locally against Preview

Prerequisites:

- Node.js 22+
- A Midnight Lace wallet on Preview with tNIGHT and spendable tDUST
- Access to a Midnight proof server (`https://proof-server.preview.midnight.network` is the Preview default)

Install dependencies:

```bash
npm install
cd frontend && npm install
cd ..
```

Run the circuit tests:

```bash
npm test
```

Check the deployer wallet's tNIGHT and DUST state:

```bash
npm run check-balance -- --network preview
```

For a new deployment, deploy and initialize on Preview. These commands persist the deployment address in the local, gitignored `.midnight-state.json` file used by the proof server:

```bash
npm run deploy -- --network preview
npm run initialize -- --network preview
```

For the existing deployment, the local `.midnight-state.json` must already contain the Preview deployment record. Do not overwrite it with a different contract address unless the frontend environment is updated to match.

Start the proof server:

```bash
npm run interact-server -- --network preview
```

In another terminal, start the dashboard:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000/app`, connect Lace, and run deposit → withdraw → borrow → repay in sequence. The proof server saves the next private position only after Lace accepts submission.

### Frontend environment

[`frontend/.env.local`](frontend/.env.local) is configured for the deployed Preview contract. For a fresh deployment, update these values together:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS="<your-deployed-contract-address>"
NEXT_PUBLIC_EXPLORER_URL="https://explorer.preview.midnight.network/contracts/<your-deployed-contract-address>"
```

## Verification commands

```bash
# Compact circuit tests
npm test

# Frontend static checks
cd frontend
npm run lint
npx tsc --noEmit
npx next build --webpack
```

## Explicitly out of scope / roadmap

- Real token custody and transfers
- Multi-asset reserves
- Oracle pricing
- Collateral health-factor enforcement
- Liquidations
- Admin reserve-parameter updates
- Production security review and audits

Interest-accrual circuits exist but are intentionally not called in the fixed-index demo flow. Before enabling accrual, the withdraw/repay sufficiency checks should be updated to compare rescaled balances.

## Project layout

- `contract/` — Compact lending contract, fixed reserve config, and circuit tests.
- `src/interact-server.ts` — proof service, private-position persistence, and Lace hand-off.
- `src/initialize.ts` — resilient initialization plus indexer verification.
- `src/check-balance.ts` — read-only tNIGHT/DUST diagnostics.
- `frontend/` — Next.js dashboard and Lace connector integration.

## Safety note

This project is a demo. Do not use it with real value or treat its accounting units as redeemable assets.
