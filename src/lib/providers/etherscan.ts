import type { Capability, Provider, ProviderFailure, StatsMap } from "./types";
import { ProviderError } from "./types";

const BASE = "https://api.etherscan.io/v2/api";

// Etherscan v2 single-endpoint multichain via chainid.
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  bnb: 56,
  "arbitrum-one": 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
  fantom: 250,
  "gnosis-chain": 100,
};

export const ETHERSCAN_KEY_PATTERN = /^[A-Z0-9]{30,40}$/;

async function esFetch(params: Record<string, string | number>, key: string) {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("apikey", key);

  const redacted = new URL(url.toString());
  redacted.searchParams.set("apikey", "***");

  const res = await fetch(url.toString());
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not json
  }
  if (!res.ok || (json && json.status === "0" && json.message !== "OK")) {
    const failure: ProviderFailure = {
      provider: "etherscan",
      status: res.status,
      url: redacted.toString(),
      path: "/v2/api",
      params: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), apikey: "***" },
      upstreamMessage: json?.result || json?.message || text?.slice(0, 200) || `HTTP ${res.status}`,
      message: `Etherscan ${res.status}: ${json?.result || json?.message || "error"}`,
    };
    throw new ProviderError(failure);
  }
  return json;
}

async function fetchChainStats(slug: string, chainid: number, key: string): Promise<StatsMap[string] | null> {
  try {
    // Best-effort: latest block number + eth price (price only meaningful for ETH chainid=1).
    const blockJson = await esFetch({ chainid, module: "proxy", action: "eth_blockNumber" }, key);
    const blocksHex: string | undefined = blockJson?.result;
    const blocks = blocksHex ? parseInt(blocksHex, 16) : null;

    let price: number | null = null;
    if (chainid === 1) {
      try {
        const priceJson = await esFetch({ chainid, module: "stats", action: "ethprice" }, key);
        const p = priceJson?.result?.ethusd;
        price = p ? Number(p) : null;
      } catch {
        // ignore
      }
    }

    return {
      data: {
        market_price_usd: price,
        market_cap_usd: null,
        blocks,
        transactions_24h: null,
        hashrate_24h: null,
        difficulty: null,
      },
    };
  } catch {
    return null;
  }
}

export const etherscanProvider: Provider = {
  id: "etherscan",
  label: "Etherscan",
  supports(cap: Capability, chain?: string) {
    if (cap !== "stats") return false;
    if (!chain) return true;
    return chain in CHAIN_IDS;
  },
  async getAllStats({ key }) {
    if (!key) {
      throw new ProviderError({
        provider: "etherscan",
        status: 0,
        url: BASE,
        path: "/v2/api",
        params: {},
        upstreamMessage: "Missing Etherscan API key",
        message: "Etherscan: API key required",
      });
    }
    const entries = await Promise.all(
      Object.entries(CHAIN_IDS).map(async ([slug, id]) => {
        const r = await fetchChainStats(slug, id, key);
        return r ? ([slug, r] as const) : null;
      }),
    );
    const ok = entries.filter((e): e is readonly [string, StatsMap[string]] => e !== null);
    if (ok.length === 0) {
      throw new ProviderError({
        provider: "etherscan",
        status: 0,
        url: BASE,
        path: "/v2/api",
        params: {},
        upstreamMessage: "All Etherscan chain queries failed",
        message: "Etherscan: all chains failed",
      });
    }
    return Object.fromEntries(ok) as StatsMap;
  },
  async validateKey(key) {
    if (!ETHERSCAN_KEY_PATTERN.test(key)) {
      throw new ProviderError({
        provider: "etherscan",
        status: 0,
        url: BASE,
        path: "/v2/api",
        params: {},
        upstreamMessage: "Invalid key shape",
        message: "Etherscan: invalid key shape (expect 30–40 chars A–Z 0–9)",
      });
    }
    await esFetch({ chainid: 1, module: "stats", action: "ethsupply" }, key);
    return { ok: true };
  },
};
