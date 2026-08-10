# Nocturne Finance — Architecture

## 1. High-level system diagram (textual)

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   Frontend (Next.js)     │        │   Lace Wallet (Midnight)  │
│   - Dashboard             │◄──────►│   - signs txs, holds keys │
│   - Deposit/Borrow/Repay  │        └──────────────────────────┘
│   - Withdraw UI            │
│   - Markets / Docs pages   │
└──────────┬────────────────┘
           │ Midnight.js SDK (DAppConnectorAPI, ContractProviders)
           ▼
┌─────────────────────────┐        ┌──────────────────────────┐
│   Proof Server            │        │   Indexer (Midnight)      │
│   - generates ZK proofs   │        │   - queries public ledger │
│     for circuit calls     │        │     state / tx history    │
└──────────┬────────────────┘        └───────────▲──────────────┘
           │ proven transaction                    │ reads
           ▼                                        │
┌─────────────────────────────────────────────────────────────┐
│                  Midnight Network (Preview/PreProd/Mainnet)    │
│  ┌───────────────────────┐   ┌───────────────────────────┐   │
│  │ Public coordination     │   │ Shielded execution layer   │   │
│  │ layer (ledger state)    │   │ (private/witness state)    │   │
│  │ - pool totals            │◄─►│ - user balances            │   │
│  │ - utilization             │   │ - user debt                 │   │
│  │ - interest index          │   │ - health factor inputs      │   │
│  └───────────────────────┘   └───────────────────────────┘   │
│              Nocturne Finance Compact contract                 │
└─────────────────────────────────────────────────────────────┘
           ▲
           │ optional, off-chain only, NOT for balances
┌──────────┴────────────────┐
│  Backend (Node/Express)    │
│  - tx history cache         │
│  - faucet/demo helpers      │
│  - (optional) Supabase       │
└─────────────────────────────┘
```

**Key architectural difference from the Aleo reference repo:** Xyra Finance (Aleo) relies on a vault backend that custodies and releases funds after finalization, plus Aleo *records* for private user state. On Midnight, the contract itself holds funds via the ledger, and private user state is modeled as **witness data** the user's own wallet/private state provider supplies to the circuit at call time — you generally do **not** need a custodial vault backend for the core lending flows. Keep the backend, if you build one at all, to read-only convenience (tx history, UI caching) — never to custody funds or hold the source of truth for balances.

## 2. Data model — the three Compact data classes

Compact makes you explicitly choose where each piece of state lives. Get this split right first; it drives everything else.

### 2.1 Ledger (public, on-chain, visible to everyone)
- `totalSupplied: Uint<128>` per asset
- `totalBorrowed: Uint<128>` per asset
- `supplyIndex: Uint<128>` / `borrowIndex: Uint<128>` — cumulative interest indices (utilization-based rate model)
- `lastAccrualTimestamp: Uint<64>`
- `reserveParams` — collateral factor, base rate, slope1/slope2 (kink model), liquidation threshold
- `poolAdmin: Bytes<32>` (address) — for gated parameter updates
- (optional stretch) `commitmentRoot` if you adopt a Merkle-style private-balance-commitment pattern instead of pure witness

### 2.2 Private state / witness (known only to the calling user's wallet)
- `userSupplied: Uint<128>`
- `userBorrowed: Uint<128>`
- `userLastIndex: Uint<128>` (to compute interest owed since last interaction)
- Supplied as **witness inputs** to each circuit call — the circuit proves the resulting state transition is valid without revealing the values on-chain.

### 2.3 Circuits (the "public interface" — what a transaction can call)
- `deposit(amount)`
- `withdraw(amount)`
- `borrow(amount)`
- `repay(amount)`
- `accrue_interest()` — recompute indices from `lastAccrualTimestamp` to now, callable by anyone or auto-triggered before other circuits
- `check_health_factor(...)` — internal helper used inside borrow/withdraw to prove collateralization without revealing the underlying numbers publicly
- (stretch) `self_liquidate(...)`, `set_reserve_params(...)` (admin-gated)

## 3. Contract module layout (`contract/`)
```
contract/
  src/
    nocturne_lending.compact   # main contract: ledger decl + circuits
    interest_math.compact      # pure math: utilization, rate curve, index accrual (unit-testable)
    health.compact             # collateral factor / health factor checks
  tests/
    interest_math.test.ts      # or compact test harness, whichever your CLI version ships
    lending_flow.test.ts       # deposit -> borrow -> repay -> withdraw scenario test
  managed/                     # compiler output (zkir, keys) — gitignored except what deploy needs
```

## 4. Frontend module layout (`frontend/`)
```
frontend/
  src/
    app/
      page.tsx                 # landing
      dashboard/page.tsx        # supply/borrow/repay/withdraw UI
      markets/page.tsx          # public pool stats (reads ledger only, no wallet needed)
      docs/page.tsx
    components/
      wallet/ConnectButton.tsx
      dashboard/PositionSummary.tsx
      dashboard/AssetRow.tsx
      dashboard/ManagePanel.tsx  # supply/withdraw/borrow/repay modal
    lib/
      midnight/
        provider.ts             # Midnight.js providers (proof server, indexer, wallet)
        contract.ts              # typed contract client generated from compiled Compact
        formatting.ts            # fixed-point <-> display conversions
    hooks/
      usePoolState.ts            # polls public ledger via indexer
      useUserPosition.ts         # reads local witness/private state via wallet provider
```

## 5. Backend (optional, keep thin)
Only build this if you need it for the demo (e.g., a faucet helper for local testing, or caching tx history so the Markets page loads fast). It should:
- Never hold private keys that can move user funds
- Never be the source of truth for balances (that's the contract + witness state)
- If used for history, read finalized transactions from the indexer and cache them — don't invent a parallel ledger like the Aleo repo's `transaction_history` table implies. If you skip this entirely for MVP, that's fine — read history straight from the indexer in the frontend.

## 6. Interest rate model (keep it simple, keep it correct)
Utilization-based, two-slope ("kink") model, same idea as Aave/Compound/the Aleo reference:
```
utilization = totalBorrowed / totalSupplied            (0 if totalSupplied == 0)
if utilization <= kink:
    borrowRate = baseRate + (utilization / kink) * slope1
else:
    borrowRate = baseRate + slope1 + ((utilization - kink) / (1 - kink)) * slope2
supplyRate = borrowRate * utilization * (1 - reserveFactor)
```
Do this math in **fixed-point integers** (e.g. scale by 1e9 or 1e18 depending on Compact's numeric types) — no floats in a circuit.

## 7. Security / correctness checklist for the contract
- All arithmetic uses checked/saturating operations — no silent overflow
- `withdraw`/`borrow` must fail (not silently clamp) if it would break the health factor or exceed pool liquidity
- `accrue_interest` must be idempotent and safe to call multiple times in the same block
- Admin-gated circuits check `poolAdmin` equality before mutating params
- No circuit should ever read another user's witness state — private state is scoped per caller by construction; don't try to work around that
- Write at least one negative test per circuit (e.g., borrow beyond collateral factor must revert)

## 8. What to explicitly leave out of the README as "not implemented"
Better to list known gaps than to imply flash loans / multi-asset / liquidation-by-others exist if they don't. Reviewers respond well to an honest "Current status" section (the Aleo README does this well — copy that pattern).