# Nocturne Finance — Project Plan
### Privacy-Preserving Lending & Borrowing on Midnight

## 1. One-line pitch
A confidential money-market protocol on Midnight — supply, borrow, and repay assets with your position kept private (witness data), while pool-level solvency (TVL, utilization, rates) stays publicly verifiable on the coordination layer.

## 2. Why this project (bootcamp fit)
"INTO the Midnight" wants a project that demonstrably uses:
- **Compact** contracts with a real public/private/witness data split (not just a toy counter)
- **Midnight CLI** for build/deploy to Preview or PreProd
- **MCP / proof server** integration (already set up in your pre-bootcamp step)
- A working frontend that talks to a deployed contract via Midnight.js
- A GitHub repo that is public, documented, and reflects the final state

A lending protocol is a strong choice because it forces you to use all three Compact data classes for a real reason: public pool totals (ledger), private user balances (witness), and provable — but not revealed — health-factor checks (circuits).

## 3. Scope for the bootcamp deadline (be honest about size)
Xyra Finance (the Aleo reference repo) is a multi-week production build: multi-asset pools, flash loans, self-liquidation, admin console, Supabase-backed history. You do **not** need all of that to submit a strong final project. Pick a scope you can actually finish and demo.

**MVP scope (recommended, ~1 asset, single pool):**
- Deposit (supply) a test token / tDUST
- Withdraw
- Borrow against collateral
- Repay
- Interest accrual (simple utilization-based rate, recomputed on each interaction)
- Private position (your balance/debt is a witness, not public state)
- Public pool aggregates (total supplied, total borrowed, utilization) readable by anyone

**Stretch goals (only after MVP is deployed and demoable):**
- Self-liquidation flow (undercollateralized position repay-and-release)
- Second asset / simple cross-collateral
- Admin-gated parameter updates (interest rate model, collateral factor)
- Transaction history UI backed by an indexer or small off-chain DB
- Flash-loan-style single-transaction borrow+repay

Do not start stretch goals until MVP deposit→borrow→repay→withdraw works end-to-end on Preview/PreProd with a real proof.

## 4. Deliverables checklist (maps to submission requirements)
- [ ] Public GitHub repo, clear README (setup, architecture link, demo steps)
- [ ] `contract/` — Compact source, compiled, tested with `compact test` / local test harness
- [ ] `contract/` deployed to Preview or PreProd, address recorded in README
- [ ] `frontend/` — working dApp (Lace wallet connect, deposit/borrow/repay/withdraw UI)
- [ ] Screenshot or short video of a successful on-chain interaction (same pattern as your setup-confirmation submission)
- [ ] `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md` (this package)
- [ ] Final Project submission via the Tasks page → GitHub connector

## 5. Milestones & rough timeline
| Phase | Goal | Exit criteria |
|---|---|---|
| 0. Setup (done) | Env, CLI, MCP, proof server, first deploy | ✅ already submitted |
| 1. Contract skeleton | Compact contract compiles, ledger + witness defined | `compact build` succeeds, local unit tests for math pass |
| 2. Core circuits | deposit / withdraw / borrow / repay / accrue_interest | Each circuit callable locally against a test ledger, private state updates correctly |
| 3. Testnet deploy | Deploy to Preview/PreProd | Contract address live, one manual tx confirmed via CLI |
| 4. Frontend wiring | Lace connect, Midnight.js provider, call each circuit | Deposit→Borrow→Repay→Withdraw works from the UI end-to-end |
| 5. Polish & docs | Health factor display, error states, README, demo video | Repo is submission-ready |
| 6. Stretch (optional) | Liquidation / 2nd asset / admin panel | Only if time remains |

## 6. Risks specific to this bootcamp (from your task comments)
- **Faucet funding is unreliable on Preview/PreProd** (multiple classmates reported 10+ min stalls). Plan B: deploy and demo against the **Midnight local/undeployed network** first (like Govind did), and only push to Preview once funded — don't block your whole build on faucet timing.
- Compact and the Midnight SDKs are actively evolving (mainnet only launched April 2026) — pin exact CLI/SDK versions in your README once you `npm install`, since API details can shift between versions.
- Keep the contract math simple (fixed-point integers, no floating point) — this is the single biggest source of bugs in every lending-protocol clone.

## 7. Naming / branding
Working name **Nocturne Finance** used throughout these docs — rename freely in a find-and-replace pass before you commit.