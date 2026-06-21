import { blockchairProvider } from "./blockchair";
import { blockscoutProvider } from "./blockscout";
import { etherscanProvider } from "./etherscan";
import { covalentProvider } from "./covalent";
import type { Provider, ProviderId } from "./types";

export const PROVIDERS: Record<ProviderId, Provider> = {
  blockchair: blockchairProvider,
  blockscout: blockscoutProvider,
  etherscan: etherscanProvider,
  covalent: covalentProvider,
};

export const PROVIDER_ORDER: ProviderId[] = ["blockchair", "blockscout", "etherscan", "covalent"];

export const PROVIDER_META: Record<
  ProviderId,
  { label: string; requiresKey: boolean; keyHint: string; getKeyUrl: string }
> = {
  blockchair: {
    label: "Blockchair",
    requiresKey: false,
    keyHint: "Optional. Raises rate limits.",
    getKeyUrl: "https://blockchair.com/api/plans",
  },
  blockscout: {
    label: "Blockscout",
    requiresKey: false,
    keyHint: "No key required. EVM chains only.",
    getKeyUrl: "https://docs.blockscout.com/",
  },
  etherscan: {
    label: "Etherscan (v2)",
    requiresKey: true,
    keyHint: "Free key at etherscan.io. Covers EVM chains via chainid.",
    getKeyUrl: "https://etherscan.io/myapikey",
  },
  covalent: {
    label: "Covalent",
    requiresKey: true,
    keyHint: "Free key at goldrush.dev. Multi-chain block heights.",
    getKeyUrl: "https://goldrush.dev/",
  },
};
