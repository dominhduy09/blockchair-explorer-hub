import type { Capability, Provider, ProviderFailure, StatsMap } from "./types";
import { ProviderError } from "./types";

const BASE = "https://api.covalenthq.com/v1";

// Covalent chain name per app slug.
const CHAIN_NAMES: Record<string, string> = {
  ethereum: "eth-mainnet",
  polygon: "matic-mainnet",
  bnb: "bsc-mainnet",
  "arbitrum-one": "arbitrum-mainnet",
  optimism: "optimism-mainnet",
  base: "base-mainnet",
  avalanche: "avalanche-mainnet",
  fantom: "fantom-mainnet",
  "gnosis-chain": "gnosis-mainnet",
};

export const COVALENT_KEY_PATTERN = /^cqt_[A-Za-z0-9_-]{20,80}$/;

async function cvFetch(path: string, key: string) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not json
  }
  if (!res.ok || json?.error === true) {
    const failure: ProviderFailure = {
      provider: "covalent",
      status: res.status,
      url,
      path,
      params: {},
      upstreamMessage: json?.error_message || text?.slice(0, 200) || `HTTP ${res.status}`,
      message: `Covalent ${res.status}: ${json?.error_message || "error"}`,
    };
    throw new ProviderError(failure);
  }
  return json;
}

export const covalentProvider: Provider = {
  id: "covalent",
  label: "Covalent",
  supports(cap: Capability, chain?: string) {
    if (cap !== "stats") return false;
    if (!chain) return true;
    return chain in CHAIN_NAMES;
  },
  async getAllStats({ key }) {
    if (!key) {
      throw new ProviderError({
        provider: "covalent",
        status: 0,
        url: BASE,
        path: "/chains/status",
        params: {},
        upstreamMessage: "Missing Covalent API key",
        message: "Covalent: API key required",
      });
    }
    // /chains/status returns array with synced_block_height + name per chain.
    const out = await cvFetch(`/chains/status/`, key);
    const items: any[] = out?.data?.items ?? [];
    const byName = new Map<string, any>();
    for (const it of items) byName.set(String(it?.name ?? ""), it);

    const map: StatsMap = {};
    for (const [slug, name] of Object.entries(CHAIN_NAMES)) {
      const it = byName.get(name);
      if (!it) continue;
      const blocks = it.synced_block_height ? Number(it.synced_block_height) : null;
      map[slug] = {
        data: {
          market_price_usd: null,
          market_cap_usd: null,
          blocks,
          transactions_24h: null,
          hashrate_24h: null,
          difficulty: null,
        },
      };
    }
    if (Object.keys(map).length === 0) {
      throw new ProviderError({
        provider: "covalent",
        status: 0,
        url: `${BASE}/chains/status/`,
        path: "/chains/status",
        params: {},
        upstreamMessage: "Empty chain status response",
        message: "Covalent: no chain data",
      });
    }
    return map;
  },
  async validateKey(key) {
    if (!COVALENT_KEY_PATTERN.test(key)) {
      throw new ProviderError({
        provider: "covalent",
        status: 0,
        url: BASE,
        path: "/chains/status",
        params: {},
        upstreamMessage: "Invalid key shape (expect cqt_… token)",
        message: "Covalent: invalid key shape",
      });
    }
    await cvFetch(`/chains/`, key);
    return { ok: true };
  },
};
