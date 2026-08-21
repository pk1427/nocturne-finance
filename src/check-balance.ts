/** Check the active Midnight wallet's transaction-funding readiness. */
import { WebSocket } from 'ws';

// Midnight SDK imports
import { resolveNetwork, getOrCreateSeed } from './network';
// unshieldedToken is re-exported from ./wallet (originally @midnight-ntwrk/midnight-js-protocol/ledger).
import { createWallet, persistWalletState, unshieldedToken } from './wallet';
import { findCustomTokenBalance, formatTokenUnits } from './token-balance.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Enable WebSocket for GraphQL subscriptions
// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

// ─── Network configuration ─────────────────────────────────────────────────────

const { network, config: networkConfig } = resolveNetwork();
const SEED = getOrCreateSeed(network);
const NIGHT_UNIT = 1_000_000n;
const DUST_UNIT = 1_000_000_000_000_000n;

function formatUnits(value: bigint, unit: bigint, decimals: number): string {
  const whole = value / unit;
  const fraction = (value % unit).toString().padStart(decimals, '0');
  return `${whole.toLocaleString()}.${fraction}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                   Wallet Balance Checker                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('  Building wallet...');
    const walletCtx = await createWallet({ network, networkConfig, seed: SEED });
    const restoredCount = Object.values(walletCtx.restored).filter(Boolean).length;
    if (restoredCount > 0) {
      console.log(`  Restored ${restoredCount}/3 child wallets from .midnight-wallet-state — sync will resume from saved point.`);
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

    const address = walletCtx.unshieldedKeystore.getBech32Address();
    const tNightBalance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    const tokenStatePath = path.resolve(process.cwd(), '.midnight-token-state.json');
    const tokenState = fs.existsSync(tokenStatePath) ? JSON.parse(fs.readFileSync(tokenStatePath, 'utf8')) as { tokenColor?: string } : {};
    const tokenBalance = findCustomTokenBalance(state.unshielded.balances, unshieldedToken().raw, tokenState.tokenColor);
    const now = new Date();
    const dustState = state.dust;
    const dustBalance = dustState.balance(now);
    const availableCoins = state.unshielded.availableCoins;
    const registeredCoins = availableCoins.filter((coin: any) => coin.meta?.registeredForDustGeneration === true);
    const unregisteredCoins = availableCoins.filter((coin: any) => coin.meta?.registeredForDustGeneration !== true);
    const registeredNightUtxos = registeredCoins.map((coin: any) => ({
      ...coin.utxo,
      ctime: coin.meta.ctime,
      registeredForDustGeneration: coin.meta.registeredForDustGeneration,
    }));
    const dustEstimates = dustState.estimateDustGeneration(registeredNightUtxos, now);

    console.log('\n─── Wallet Details ─────────────────────────────────────────────\n');
    console.log(`  Address: ${address}`);
    console.log(`  Network: ${networkConfig.networkId}\n`);

    console.log('─── Balances ───────────────────────────────────────────────────\n');
    console.log(`  tNight: ${tNightBalance.toLocaleString()} raw (${formatUnits(tNightBalance, NIGHT_UNIT, 6)} tNight)`);
    console.log(`  DUST:   ${dustBalance.toLocaleString()} raw (${formatUnits(dustBalance, DUST_UNIT, 15)} DUST)\n`);
    console.log('─── Custom Token Balance ──────────────────────────────────────\n');
    console.log('  Token: tUSDC');
    console.log(`  Token color: ${tokenBalance.tokenColor}`);
    console.log(`  Raw balance: ${tokenBalance.raw.toLocaleString()}`);
    console.log(`  Balance: ${formatTokenUnits(tokenBalance.raw)} tUSDC\n`);
    console.log('─── DUST Generation Status ────────────────────────────────────\n');
    console.log(`  Available tNight UTXOs:    ${availableCoins.length}`);
    console.log(`  Registered for generation: ${registeredCoins.length}`);
    console.log(`  Awaiting registration:     ${unregisteredCoins.length}\n`);

    console.log('─── Read-only DUST Generation Estimate ─────────────────────────\n');
    console.log(`  Timestamp: ${now.toISOString()}`);
    if (dustEstimates.length === 0) {
      console.log('  No registered tNight UTXOs available for estimation.\n');
    } else {
      for (const [index, estimate] of dustEstimates.entries()) {
        const nightAmount = estimate.utxo.value;
        const { dust } = estimate;
        console.log(`  Registered UTXO ${index + 1}:`);
        console.log(`    Backing tNight:       ${nightAmount.toLocaleString()} raw (${formatUnits(nightAmount, NIGHT_UNIT, 6)} tNight)`);
        console.log(`    UTXO creation time:   ${estimate.utxo.ctime.toISOString()}`);
        console.log(`    Registration status:  ${estimate.utxo.registeredForDustGeneration ? 'registered' : 'unregistered'}`);
        console.log(`    Theoretical DUST now: ${dust.generatedNow.toLocaleString()} raw (${formatUnits(dust.generatedNow, DUST_UNIT, 15)} DUST)`);
        console.log(`    Estimated rate:       ${dust.rate.toLocaleString()} SPECK/s`);
        console.log(`    Estimated cap:        ${dust.maxCap.toLocaleString()} raw (${formatUnits(dust.maxCap, DUST_UNIT, 15)} DUST)`);
        console.log(`    Estimated cap time:   ${dust.maxCapReachedAt.toISOString()}`);
      }
      console.log('  Note: this SDK estimator projects from the tNight UTXO creation time.');
      console.log('  The DUST balance above is the authoritative spendable amount; a projection does not prove registration has produced a spendable DUST UTXO.');
      console.log('');
    }

    console.log('─── Initialize Fee Readiness ───────────────────────────────────\n');
    console.log('  Exact initialize fee: unavailable without constructing an initialize transaction (not constructed).');
    console.log(`  Current DUST can balance an unknown positive fee: ${dustBalance > 0n ? 'possibly — estimate the transaction first' : 'no'}\n`);

    if (tNightBalance === 0n) {
      if (network === 'undeployed') {
        console.log('  ⚠ Wallet has no tNight. Make sure the local devnet is running');
        console.log('     (npm run setup) — the genesis seed is pre-funded by the dev preset.\n');
      } else if (networkConfig.faucet) {
        console.log(`  ⚠ Wallet has no tNight. Fund it from the faucet:`);
        console.log(`     ${networkConfig.faucet}`);
        console.log(`     Wallet address: ${address}\n`);
      } else {
        console.log('  ⚠ Wallet has no tNight.\n');
      }
    } else if (dustBalance === 0n && unregisteredCoins.length > 0) {
      console.log('  ⚠ tNight is present, but DUST is zero: contract transactions cannot be balanced yet.\n');
      console.log('  Next: register the available tNight UTXOs for DUST generation, then wait for DUST to accrue.');
      console.log('  Run: npm run setup -- --network preview\n');
    } else if (dustBalance === 0n) {
      console.log('  ⚠ All visible tNight UTXOs are registered, but DUST is still zero: contract transactions cannot be balanced yet.\n');
      console.log('  DUST starts accruing only after registration is processed on-chain. On Preview this can take substantial time.');
      console.log('  Recheck with: npm run check-balance -- --network preview\n');
    } else {
      console.log('  ✅ Wallet has both tNight and DUST and can fund transactions.\n');
    }

    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
