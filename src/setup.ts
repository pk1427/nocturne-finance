/**
 * Setup script for nocturne-finance.
 *
 * Runs the one-time preparation steps needed before the first deploy:
 *   1. Start/verify the local proof server (Docker)
 *   2. Create/fund the wallet
 *   3. Register UTXOs for DUST
 *
 * Non-interactive: no readline prompts.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveNetwork, getOrCreateSeed, recordDeployment } from './network';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'nocturneLendingPrivateState';

const { network, config: networkConfig } = resolveNetwork();

async function waitForProofServer(maxAttempts = 60, delayMs = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fetch(networkConfig.proofServer, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return true;
    } catch (err: any) {
      const code = err?.cause?.code || err?.code || '';

      if (
        code !== 'ECONNREFUSED' &&
        code !== 'UND_ERR_CONNECT_TIMEOUT' &&
        code !== 'UND_ERR_SOCKET'
      ) {
        return true;
      }
    }

    if (attempt < maxAttempts) {
      process.stdout.write(
        `\r  Waiting for proof server... (${attempt}/${maxAttempts})   `,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return false;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  nocturne-finance setup (${network})`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const seed = getOrCreateSeed(network);

  console.log('─── Wallet setup ───────────────────────────────────────────────\n');

  console.log('  Creating wallet...');
  const walletCtx = await createWallet({
    network,
    networkConfig,
    seed,
  });

  await persistWalletState(network, walletCtx);

  console.log('  Wallet ready.\n');

  console.log('  Syncing with network...');
  console.log('  ℹ  This may take several minutes depending on network size.');
  console.log(
    '     RPC disconnection messages during sync are normal and can be safely ignored.\n',
  );

  const syncStart = Date.now();

  const syncInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - syncStart) / 1000);

    process.stdout.write(
      `\r  ⏳ Still syncing... (${elapsed}s elapsed)   `,
    );
  }, 5000);

  const state = await walletCtx.wallet.waitForSyncedState();

  clearInterval(syncInterval);

  process.stdout.write(
    '\r  ✓ Synced with network.                                      \n',
  );

  const address = walletCtx.unshieldedKeystore.getBech32Address();

  let balance =
    state.unshielded.balances[unshieldedToken().raw] ?? 0n;

  console.log(`\n  Wallet Address: ${address}`);
  console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

  /*
   * --------------------------------------------------------------------------
   * FUND WALLET
   * --------------------------------------------------------------------------
   */

  if (network === 'undeployed' && balance === 0n) {
    console.error(
      '\n❌ Genesis-seed wallet has zero NIGHT. The devnet preset may not have minted to it.\n' +
        '   Check `docker compose ps` and `docker compose logs node`. Then `docker compose down -v` and retry.\n',
    );

    await walletCtx.wallet.stop();
    process.exit(1);
  }

  if (network !== 'undeployed' && networkConfig.faucet) {
    const initialBalance = await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.filter((s) => s.isSynced),
      ),
    );

    const initialTNight =
      initialBalance.unshielded.balances[unshieldedToken().raw] ?? 0n;

    if (initialTNight === 0n) {
      console.log(
        '─── Fund Wallet ────────────────────────────────────────────────\n',
      );

      console.log(`  Wallet address: ${address}`);
      console.log(`  Faucet:         ${networkConfig.faucet}`);
      console.log('');

      console.log('  Waiting for tNIGHT to arrive (poll every 10s)...');

      const rawTimeout = Number(
        process.env.MIDNIGHT_FAUCET_TIMEOUT_MS,
      );

      const timeoutMs =
        Number.isFinite(rawTimeout) && rawTimeout > 0
          ? rawTimeout
          : 600_000;

      const start = Date.now();

      while (true) {
        await new Promise((r) => setTimeout(r, 10_000));

        const s = await Rx.firstValueFrom(
          walletCtx.wallet.state().pipe(
            Rx.filter((x) => x.isSynced),
          ),
        );

        const tn =
          s.unshielded.balances[unshieldedToken().raw] ?? 0n;

        if (tn > 0n) {
          console.log(
            `\n  Funded! tNIGHT balance: ${tn.toLocaleString()}\n`,
          );
          break;
        }

        if (Date.now() - start > timeoutMs) {
          console.log(
            `\n  ❌ Funding not received within ${Math.round(
              timeoutMs / 60_000,
            )} min.`,
          );

          console.log(`  Address: ${address}`);
          console.log(`  Faucet:  ${networkConfig.faucet}`);
          console.log(
            '  Re-run setup after funding — your seed is preserved.\n',
          );

          await walletCtx.wallet.stop();
          process.exit(1);
        }

        const elapsed = Math.round(
          (Date.now() - start) / 1000,
        );

        process.stdout.write(
          `\r  ...still waiting (${elapsed}s elapsed)`,
        );
      }
    }
  }

  /*
   * --------------------------------------------------------------------------
   * DUST SETUP
   * --------------------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Registering a NIGHT UTXO for DUST generation does NOT necessarily mean
   * spendable DUST is immediately available.
   *
   * DUST accrues over time. Therefore setup must NOT block indefinitely on:
   *
   *   dust.balance(new Date()) > 0n
   *
   * Instead we:
   *
   *   1. Find eligible NIGHT UTXOs.
   *   2. Register them for DUST generation.
   *   3. Re-read wallet state.
   *   4. Report the current spendable DUST.
   *   5. Persist the wallet state.
   *   6. Exit successfully.
   */

  console.log(
    '─── DUST Token Setup ───────────────────────────────────────────\n',
  );

  const dustState = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.filter((s) => s.isSynced),
    ),
  );

  const nativeTokenRaw = unshieldedToken().raw;

  /*
   * Only NIGHT UTXOs can be registered for DUST generation.
   *
   * Do NOT pass tUSDC or other custom-token UTXOs here.
   */
  const unregisteredUtxos =
    dustState.unshielded.availableCoins.filter(
      (c: any) => {
        const tokenRaw = c.utxo?.type;

        return (
          !c.meta?.registeredForDustGeneration &&
          tokenRaw === nativeTokenRaw
        );
      },
    );

  if (unregisteredUtxos.length > 0) {
    console.log(
      `  Registering ${unregisteredUtxos.length} NIGHT UTXOs for DUST generation...`,
    );

    const recipe =
      await walletCtx.wallet.registerNightUtxosForDustGeneration(
        unregisteredUtxos,
        walletCtx.unshieldedKeystore.getPublicKey(),
        (payload) =>
          walletCtx.unshieldedKeystore.signData(payload),
      );

    const finalized =
      await walletCtx.wallet.finalizeRecipe(recipe);

    await walletCtx.wallet.submitTransaction(finalized);

    console.log('  ✓ DUST generation registration submitted.\n');
  } else {
    console.log(
      '  ✓ No unregistered NIGHT UTXOs found.',
    );

    console.log(
      '    Existing NIGHT UTXOs are already registered for DUST generation.\n',
    );
  }

  /*
   * --------------------------------------------------------------------------
   * CHECK CURRENT DUST STATE
   * --------------------------------------------------------------------------
   */

  const postRegistrationState =
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.filter((s) => s.isSynced),
      ),
    );

  const currentDust =
    postRegistrationState.dust.balance(new Date());

  const availableNightUtxos =
    postRegistrationState.unshielded.availableCoins.filter(
      (c: any) => c.utxo?.type === nativeTokenRaw,
    );

  const registeredNightUtxos =
    availableNightUtxos.filter(
      (c: any) =>
        c.meta?.registeredForDustGeneration === true,
    );

  const unregisteredNightUtxos =
    availableNightUtxos.filter(
      (c: any) =>
        c.meta?.registeredForDustGeneration !== true,
    );

  console.log(
    '─── DUST Generation Status ─────────────────────────────────────\n',
  );

  console.log(
    `  Available NIGHT UTXOs:    ${availableNightUtxos.length}`,
  );

  console.log(
    `  Registered for generation: ${registeredNightUtxos.length}`,
  );

  console.log(
    `  Awaiting registration:     ${unregisteredNightUtxos.length}`,
  );

  console.log(
    `  Spendable DUST:            ${currentDust.toString()} raw`,
  );

  /*
   * DUST is allowed to be zero here.
   *
   * This is expected when the NIGHT UTXO has only recently been registered
   * or when the generated DUST has not yet become a spendable DUST UTXO.
   */

  if (currentDust > 0n) {
    console.log(
      `\n  ✓ Spendable DUST available: ${currentDust.toString()} raw\n`,
    );
  } else if (registeredNightUtxos.length > 0) {
    console.log(
      '\n  ✓ NIGHT UTXO is registered for DUST generation.',
    );

    console.log(
      '  ℹ  Spendable DUST is currently 0.',
    );

    console.log(
      '  ℹ  DUST will accrue from the registered NIGHT UTXO.',
    );

    console.log(
      '  ℹ  Setup will continue without waiting indefinitely.\n',
    );
  } else {
    console.log(
      '\n  ⚠ No NIGHT UTXO is currently registered for DUST generation.',
    );

    console.log(
      '  ⚠ Contract transactions will not be ready until DUST generation is registered.\n',
    );
  }

  /*
   * --------------------------------------------------------------------------
   * PERSIST WALLET
   * --------------------------------------------------------------------------
   */

  await persistWalletState(network, walletCtx);

  await walletCtx.wallet.stop();

  console.log(
    '─── Setup complete ─────────────────────────────────────────────\n',
  );

  console.log('  Wallet state persisted.');

  if (currentDust > 0n) {
    console.log('  DUST is available.');

    console.log('  Next: npm run deploy\n');
  } else {
    console.log(
      '  DUST generation is registered but spendable DUST is not yet available.',
    );

    console.log(
      '  Check later with:',
    );

    console.log(
      '    npm run check-balance -- --network preview\n',
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});