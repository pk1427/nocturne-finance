import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  serverExternalPackages: [
    "@midnight-ntwrk/midnight-js-protocol",
    "@midnight-ntwrk/midnight-js-contracts",
    "@midnight-ntwrk/midnight-js-http-client-proof-provider",
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider",
    "@midnight-ntwrk/midnight-js-node-zk-config-provider",
    "@midnight-ntwrk/wallet-sdk",
    "@midnight-ntwrk/wallet-sdk-abstractions",
    "@midnight-ntwrk/ledger-v8",
    "@midnight-ntwrk/onchain-runtime-v3",
    "ws",
  ],
};

export default nextConfig;
