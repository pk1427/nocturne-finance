# Nocturne Finance — Implementation Plan

Step-by-step build order. Each step has a concrete "done when" so you can checkpoint progress and know when to move on. Do them in order — don't start the frontend before circuit 1 is proven locally.

## Step 0 — Repo & environment
- `mkdir nocturne-finance && cd nocturne-finance && git init`
- Create top-level folders: `contract/`, `frontend/`, `docs/`
- Confirm your bootcamp setup still works: `midnight --version` (or your CLI's actual command), proof server running, MCP configured
- Done when: empty repo pushed to GitHub, public, with a placeholder README

## Step 1 — Compact contract skeleton
- Scaffold `contract/src/nocturne_lending.compact` with the ledger declarations from `02_ARCHITECTURE.md` §2.1 and an empty `constructor`
- `compact build` (or your CLI's build command) succeeds with zero circuits yet
- Done when: contract compiles to zkir with no errors

## Step 2 — Interest math module, unit-tested in isolation
- Write `interest_math.compact` with the utilization + kink-rate function from §6
- Write plain TypeScript unit tests against the pure math logic (mirror the Compact formula in TS, compare outputs) — this is the fastest way to catch arithmetic bugs before wiring circuits
- Done when: rate curve produces expected values at utilization = 0%, 50%, kink%, 100%

## Step 3 — `deposit` circuit
- Ledger update: `totalSupplied += amount`
- Witness update: `userSupplied += amount` (with index bookkeeping)
- Local test: call deposit against a mock ledger/private-state harness, assert both states update
- Done when: a local test proves deposit changes state correctly and rejects `amount == 0`

## Step 4 — `withdraw` circuit
- Must call `accrue_interest` logic first (or assume caller calls it, your choice — document it)
- Reject if `amount > userSupplied` or would break health factor for an existing borrow
- Done when: local test covers happy path + the two rejection cases

## Step 5 — `borrow` circuit
- Requires `health.compact` collateral-factor check
- Reject if resulting position would be undercollateralized, or if `amount > pool liquidity`
- Done when: local test covers happy path, over-borrow rejection, empty-pool rejection

## Step 6 — `repay` circuit
- Reject if `amount > userBorrowed` (or cap it — decide and document which)
- Done when: local test covers full repay and partial repay

## Step 7 — `accrue_interest` circuit
- Recompute `supplyIndex`/`borrowIndex` from `lastAccrualTimestamp`
- Idempotent: calling twice in the same timestamp is a no-op
- Done when: local test calls it twice back-to-back and confirms no double-accrual

## Step 8 — Full local flow test
- Single test script: deposit → borrow → time passes (mock) → repay → withdraw, asserting pool + user state at each step
- Done when: this script passes locally against the compiled contract

## Step 9 — Deploy to Preview/PreProd
- `midnight deploy --network preview` (or PreProd, matching your bootcamp instructions)
- **If the faucet is stalling** (a known issue this cohort hit repeatedly per the task comments): deploy first against the local/undeployed network to prove the contract works, keep retrying the faucet in parallel, and switch to Preview once funded — don't let faucet flakiness block Steps 1–8
- Record the deployed contract address in `docs/DEPLOYMENT.md`
- Done when: one manual deposit transaction confirms on Preview/PreProd via CLI (before touching the frontend)

## Step 10 — Frontend scaffold
- `npx create-next-app@latest frontend` (or your team's preferred starter)
- Wire up Midnight.js providers (proof server URL, indexer URL, wallet connector) per `02_ARCHITECTURE.md` §4
- Generate/import the typed contract client from the compiled Compact artifacts
- Done when: frontend can read public ledger state (`totalSupplied`, `utilization`) with no wallet connected, on the Markets page

## Step 11 — Wallet connect
- Lace wallet connect button, session persistence
- Done when: connecting shows the user's address and their private position (initially zero)

## Step 12 — Wire up Deposit → Borrow → Repay → Withdraw in the UI
- One "Manage" panel per asset, same pattern as the Aleo reference's expandable row
- Show pending/processing state while the proof server generates the proof (this can take several seconds — say so in the UI, don't leave it looking frozen)
- Done when: you can do a full deposit→borrow→repay→withdraw cycle from the browser against Preview/PreProd

## Step 13 — Dashboard polish
- Position summary: collateral, borrowable, debt, health factor
- Error states: insufficient balance, health-factor violation, wallet not connected
- Done when: dashboard matches or exceeds the clarity of the Aleo reference's dashboard description

## Step 14 — Docs & submission polish
- Finish `README.md`: problem/solution, current status (be honest about scope), setup steps, screenshot/video of a live tx
- Copy `01_PROJECT_PLAN.md` / `02_ARCHITECTURE.md` into `docs/`
- Done when: a stranger could clone the repo and get it running from the README alone

## Step 15 — Submit
- Connect GitHub in the Tasks page, pick this repo, submit for review
- Done when: submission status changes from "Awaiting submission"

## Stretch steps (only if 0–15 are done with time to spare)
- S1. Self-liquidation circuit + UI flow
- S2. Second asset / simple cross-collateral health factor
- S3. Admin-gated `set_reserve_params` circuit + minimal admin page
- S4. Tx history page backed by the indexer (or a thin read-only backend cache)
- S5. Flash-loan-style circuit (open+settle in one call) — hardest stretch item, do last