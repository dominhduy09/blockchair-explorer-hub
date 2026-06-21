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
    keyHint: "Optional Pro key (api.blockscout.com). Public instances work without one.",
    getKeyUrl: "https://blockscout.com/pricing",
  },
  etherscan: {
    label: "Etherscan (v2)",
    requiresKey: true,
    keyHint: "Free key from etherscan.io/myapikey. Typically 34 alphanumeric chars.",
    getKeyUrl: "https://etherscan.io/myapikey",
  },
  covalent: {
    label: "Covalent / GoldRush",
    requiresKey: true,
    keyHint: "Free key from goldrush.dev. Paste the full key string.",
    getKeyUrl: "https://goldrush.dev/",
  },
};
