import * as fs from 'node:fs';
import * as path from 'node:path';

export const MULTI_CONTRACT_NAME = 'nocturne_lending_multi';
export const MULTI_DEPLOYMENT_ID = 'nocturne-lending-multi-experimental';
export const MULTI_STATE_FILE = '.midnight-multi-state.json';
export const MULTI_PRIVATE_STATE_STORE = 'nocturne-lending-multi-private-state';
export const TUSDC_COLOR = 'f7487a379a9308465bf89f0c57059f65d2bacd6f49219942e89f177fbdc686f6';

export type MultiManifest = {
  contractName: string;
  deploymentId: string;
  network: string;
  contractAddress: string | null;
  tusdcTokenColor: string;
  stateFile: string;
  privateStateStore: string;
  deployedAt: string | null;
};

export function manifestPath(cwd = process.cwd()): string { return path.join(cwd, MULTI_STATE_FILE); }
export function artifactPath(cwd = process.cwd()): string { return path.join(cwd, 'contract', 'managed', MULTI_CONTRACT_NAME); }

export function emptyManifest(network: string): MultiManifest {
  return { contractName: MULTI_CONTRACT_NAME, deploymentId: MULTI_DEPLOYMENT_ID, network, contractAddress: null, tusdcTokenColor: TUSDC_COLOR, stateFile: MULTI_STATE_FILE, privateStateStore: MULTI_PRIVATE_STATE_STORE, deployedAt: null };
}

export function validateMultiManifest(manifest: MultiManifest, expectedNetwork?: string, cwd = process.cwd()): void {
  if (manifest.contractName !== MULTI_CONTRACT_NAME) throw new Error('Experimental manifest has the wrong contract name');
  if (manifest.deploymentId !== MULTI_DEPLOYMENT_ID) throw new Error('Experimental manifest has the wrong deployment identifier');
  if (expectedNetwork && manifest.network !== expectedNetwork) throw new Error(`Experimental manifest network mismatch: ${manifest.network}`);
  if (!/^[0-9a-f]{64}$/i.test(manifest.tusdcTokenColor)) throw new Error('Missing or invalid tUSDC token color');
  if (manifest.stateFile !== MULTI_STATE_FILE) throw new Error('Experimental state file is not isolated');
  if (manifest.privateStateStore !== MULTI_PRIVATE_STATE_STORE) throw new Error('Experimental private state store is not isolated');
  const production = process.env.NOCTURNE_CONTRACT_ADDRESS;
  if (manifest.contractAddress && production && manifest.contractAddress === production) throw new Error('Experimental workflow targets the production contract');
  if (!fs.existsSync(artifactPath(cwd))) throw new Error('Experimental contract artifacts are missing; compile first');
}

export function loadMultiManifest(network: string, cwd = process.cwd()): MultiManifest {
  const p = manifestPath(cwd);
  if (!fs.existsSync(p)) throw new Error(`Missing ${MULTI_STATE_FILE}; experimental deployment is not configured`);
  const manifest = JSON.parse(fs.readFileSync(p, 'utf8')) as MultiManifest;
  validateMultiManifest(manifest, network, cwd);
  return manifest;
}
