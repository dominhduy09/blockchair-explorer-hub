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

// Unified Blockscout API (Pro) — chain id keyed.
const UNIFIED_BASE = "https://api.blockscout.com";
const UNIFIED_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  optimism: 10,
  "gnosis-chain": 100,
  polygon: 137,
  base: 8453,
  "arbitrum-one": 42161,
};

function withKey(url: string, key?: string) {
  if (!key) return url;
  const u = new URL(url);
  u.searchParams.set("apikey", key);
  return u.toString();
}

function redact(url: string) {
  try {
    const u = new URL(url);
    if (u.searchParams.has("apikey")) u.searchParams.set("apikey", "***");
    return u.toString();
  } catch {
    return url;
  }
}

async function getJSON(url: string, providerPath: string): Promise<any> {
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
      url: redact(url),
      path: providerPath,
      params: {},
      upstreamMessage:
        json?.message || (typeof json?.error === "string" ? json.error : null) || text?.slice(0, 200) || `HTTP ${res.status}`,
      message: `Blockscout ${res.status}: ${json?.message || "error"}`,
    };
    throw new ProviderError(failure);
  }
  return json;
}

function normalize(raw: any): StatsMap[string] {
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
    if (!chain) return true;
    return chain in INSTANCES;
  },
  async getAllStats({ key }: { key?: string } = {}) {
    const entries = await Promise.all(
      Object.entries(INSTANCES).map(async ([slug, host]) => {
        try {
          const raw = await getJSON(
            withKey(`${host}/api/v2/stats`, key),
            `/api/v2/stats (${slug})`,
          );
          return [slug, normalize(raw)] as const;
        } catch {
          return null;
        }
      }),
    );
    const ok = entries.filter((e): e is readonly [string, StatsMap[string]] => e !== null);
    if (ok.length === 0) {
      throw new ProviderError({
        provider: "blockscout",
        status: 0,
        url: "multiple",
        path: "/api/v2/stats (all instances)",
        params: {},
        upstreamMessage: "All Blockscout instances failed",
        message: "Blockscout: all instances failed",
      });
    }
    return Object.fromEntries(ok) as StatsMap;
  },
  async validateKey(key) {
    // Hit the unified Pro API for chain 1 — this is the endpoint Pro keys authenticate against.
    const url = withKey(`${UNIFIED_BASE}/${UNIFIED_CHAIN_IDS.ethereum}/api/v2/stats`, key);
    await getJSON(url, `/${UNIFIED_CHAIN_IDS.ethereum}/api/v2/stats`);
    return { ok: true };
  },
};

