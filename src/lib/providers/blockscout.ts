import type { Capability, Provider, ProviderFailure, StatsMap } from "./types";
import { ProviderError } from "./types";

// Public Blockscout instances per EVM chain slug.
const INSTANCES: Record<string, string> = {
  ethereum: "https://eth.blockscout.com",
  polygon: "https://polygon.blockscout.com",
  "gnosis-chain": "https://gnosis.blockscout.com",
  optimism: "https://optimism.blockscout.com",
  "arbitrum-one": "https://arbitrum.blockscout.com",
  base: "https://base.blockscout.com",
  "ethereum-classic": "https://etc.blockscout.com",
};

async function fetchInstanceStats(slug: string, host: string) {
  const url = `${host}/api/v2/stats`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not json
  }
  if (!res.ok) {
    const failure: ProviderFailure = {
      provider: "blockscout",
      status: res.status,
      url,
      path: `/api/v2/stats (${slug})`,
      params: {},
      upstreamMessage: text?.slice(0, 200) || `HTTP ${res.status}`,
      message: `Blockscout ${slug} ${res.status}`,
    };
    throw new ProviderError(failure);
  }
  return json;
}

function normalize(slug: string, raw: any): StatsMap[string] {
  // Blockscout returns shape: { total_blocks, average_block_time, coin_price,
  // market_cap, total_transactions, gas_prices, ... }
  const price = raw?.coin_price ? Number(raw.coin_price) : null;
  const cap = raw?.market_cap ? Number(raw.market_cap) : null;
  const blocks = raw?.total_blocks ? Number(raw.total_blocks) : null;
  const tx = raw?.total_transactions ? Number(raw.total_transactions) : null;
  return {
    data: {
      market_price_usd: price,
      market_cap_usd: cap,
      blocks,
      transactions_24h: null,
      transactions: tx,
      hashrate_24h: null,
      difficulty: null,
    },
  };
}

export const blockscoutProvider: Provider = {
  id: "blockscout",
  label: "Blockscout",
  supports(cap: Capability, chain?: string) {
    if (cap !== "stats") return false;
    if (!chain) return true; // multi-chain stats: aggregate
    return chain in INSTANCES;
  },
  async getAllStats() {
    // Aggregate per-instance, tolerating individual failures.
    const entries = await Promise.all(
      Object.entries(INSTANCES).map(async ([slug, host]) => {
        try {
          const raw = await fetchInstanceStats(slug, host);
          return [slug, normalize(slug, raw)] as const;
        } catch {
          return null;
        }
      }),
    );
    const ok = entries.filter((e): e is readonly [string, StatsMap[string]] => e !== null);
    if (ok.length === 0) {
      // Surface a representative failure if every instance failed.
      const failure: ProviderFailure = {
        provider: "blockscout",
        status: 0,
        url: "multiple",
        path: "/api/v2/stats (all instances)",
        params: {},
        upstreamMessage: "All Blockscout instances failed",
        message: "Blockscout: all instances failed",
      };
      throw new ProviderError(failure);
    }
    return Object.fromEntries(ok) as StatsMap;
  },
};
