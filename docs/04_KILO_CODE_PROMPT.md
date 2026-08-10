# Prompt for Kilo Code — Nocturne Finance (Midnight lending protocol)

Use this after `code .` in your empty project folder, with `01_PROJECT_PLAN.md`,
`02_ARCHITECTURE.md`, and `03_IMPLEMENTATION_PLAN.md` attached/placed in the repo root
(e.g. under `docs/`). Paste the prompt below into Kilo Code's chat.

---

I'm building "Nocturne Finance," a privacy-preserving lending & borrowing protocol on the
Midnight network, for a bootcamp final project. I've attached three planning docs in this
repo: PROJECT_PLAN.md, ARCHITECTURE.md, and IMPLEMENTATION_PLAN.md — read all three before
writing any code, they define the scope, data model, and exact build order.

Constraints:
- Follow IMPLEMENTATION_PLAN.md step by step, in order. Do not jump ahead to the frontend
  before the contract steps (1–9) are complete and locally tested.
- The smart contract is written in Compact and lives in `contract/`. Use the ledger /
  private-state(witness) / circuit split exactly as described in ARCHITECTURE.md §2 — do
  not put user balances in public ledger state, and do not put pool aggregates in private
  state.
- All contract arithmetic must be fixed-point integer math — no floats.
- Confirm the exact Compact CLI commands, project scaffolding commands, and Midnight.js
  SDK APIs against my installed CLI/SDK version before using them (run `--help` / check
  `package.json` versions) rather than assuming — the tooling has changed across Midnight
  releases and I'd rather you verify than guess.
- After each numbered step in IMPLEMENTATION_PLAN.md, stop and tell me the "done when"
  criteria was met (or wasn't) before moving to the next step. Don't silently batch
  multiple steps together.
- Keep any backend component read-only/optional per ARCHITECTURE.md §5 — no custodial
  vault, no source-of-truth balances off-chain.
- Write the negative-path tests called out in ARCHITECTURE.md §7 (over-borrow rejection,
  over-withdraw rejection, double-accrual idempotency) alongside each circuit, not at the
  end.

Start with Step 0 and Step 1 of IMPLEMENTATION_PLAN.md: scaffold the repo structure and the
Compact contract skeleton with just the ledger declarations and an empty constructor. Show
me the file(s) before running the build, then run `compact build` (or the correct current
build command) and report the result.

---

## Tips for the session
- If Kilo Code proposes an API that doesn't match what's actually installed, tell it to
  check `node_modules`/CLI `--help` output rather than trust its training data — Midnight
  tooling is young and moves fast.
- Re-paste the relevant IMPLEMENTATION_PLAN.md step number whenever you start a new Kilo
  Code session/context, so it doesn't lose the plan.
- If the Preview/PreProd faucet stalls again (per the task-page comments from your cohort),
  tell Kilo Code explicitly to target the local/undeployed network for Step 9 first.