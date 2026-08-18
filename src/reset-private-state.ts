import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { resolveNetwork, getDeployment } from './network.js';

const accountId = process.argv.find((arg) => arg.startsWith('--account='))?.slice('--account='.length)
  ?? process.argv[process.argv.indexOf('--account') + 1];
if (!accountId || accountId.startsWith('--')) throw new Error('Usage: npm run reset-private-state -- --account <shielded-address> --network preview');

const { network } = resolveNetwork();
const deployment = getDeployment(network);
if (!deployment) throw new Error(`No ${network} deployment recorded`);

const provider = levelPrivateStateProvider({
  privateStateStoreName: 'nocturne-lending-state',
  accountId,
  privateStoragePasswordProvider: () => process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Dev-Development-Placeholder-1',
});
provider.setContractAddress(deployment.address);
await provider.set('nocturneLendingPrivateState', {
  // Explorer confirms the native deposit is exactly 1,000,000 base units.
  userSupplied: 1_000_000n,
  userBorrowed: 0n,
  userLastSupplyIndex: 1_000_000n,
  userLastBorrowIndex: 1_000_000n,
});
console.log(`Reset private lending state for ${accountId} at ${deployment.address}`);
