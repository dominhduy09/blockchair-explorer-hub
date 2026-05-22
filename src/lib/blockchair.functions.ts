import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CHAIN_SLUGS } from "./chains";

const BASE = "https://api.blockchair.com";

const chainSchema = z.enum(CHAIN_SLUGS as [string, ...string[]]);

async function bcFetch(path: string, params: Record<string, string | number | undefined> = {}) {
  const key = process.env.BLOCKCHAIR_API_KEY;
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "lovable-blockchair-explorer/1.0" },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = json?.context?.error || `Upstream error ${res.status}`;
    throw new Error(`Blockchair: ${msg}`);
  }
  return json;
}

// ---- Global stats (all chains) ----
export const getAllStats = createServerFn({ method: "GET" }).handler(async () => {
  const data = await bcFetch("/stats");
  return data?.data ?? {};
});

// ---- Chain-level stats ----
export const getChainStats = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string }) => ({ chain: chainSchema.parse(input.chain) }))
  .handler(async ({ data }) => {
    const out = await bcFetch(`/${data.chain}/stats`);
    return out?.data ?? null;
  });

// ---- Block ----
export const getBlock = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string; id: string }) => ({
    chain: chainSchema.parse(input.chain),
    id: z.string().min(1).max(200).parse(input.id),
  }))
  .handler(async ({ data }) => {
    const out = await bcFetch(`/${data.chain}/dashboards/block/${encodeURIComponent(data.id)}`, {
      limit: 100,
    });
    return out ?? null;
  });

// ---- Transaction ----
export const getTransaction = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string; hash: string }) => ({
    chain: chainSchema.parse(input.chain),
    hash: z.string().min(1).max(200).parse(input.hash),
  }))
  .handler(async ({ data }) => {
    const out = await bcFetch(
      `/${data.chain}/dashboards/transaction/${encodeURIComponent(data.hash)}`,
    );
    return out ?? null;
  });

// ---- Address ----
export const getAddress = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string; address: string; offset?: number }) => ({
    chain: chainSchema.parse(input.chain),
    address: z.string().min(1).max(200).parse(input.address),
    offset: input.offset ?? 0,
  }))
  .handler(async ({ data }) => {
    const out = await bcFetch(
      `/${data.chain}/dashboards/address/${encodeURIComponent(data.address)}`,
      { limit: 50, offset: data.offset },
    );
    return out ?? null;
  });

// ---- Smart search: detect query type, probe likely chains in parallel ----
// Blockchair does not expose a public cross-chain /search endpoint, so we
// classify the query by format and probe each candidate chain's dashboards
// endpoint. Any chain that returns non-null data is a hit.

const EVM_CHAINS = [
  "ethereum",
  "polygon",
  "bnb",
  "base",
  "arbitrum-one",
  "optimism",
  "avalanche",
  "fantom",
  "gnosis-chain",
  "ethereum-classic",
];
const UTXO_CHAINS = ["bitcoin", "litecoin", "dogecoin", "bitcoin-cash", "dash", "zcash"];

type Hit = { chain: string; type: "block" | "transaction" | "address"; query: string };

async function probe(chain: string, type: Hit["type"], q: string): Promise<Hit | null> {
  try {
    const path = `/${chain}/dashboards/${type}/${encodeURIComponent(q)}`;
    const out = await bcFetch(path, { limit: 1 });
    const d = out?.data;
    if (!d) return null;
    // Blockchair returns { data: {} } or { data: { <key>: {...} } } when found,
    // and { data: null } or { data: [] } when not.
    if (Array.isArray(d) && d.length === 0) return null;
    if (typeof d === "object" && Object.keys(d).length === 0) return null;
    return { chain, type, query: q };
  } catch {
    return null;
  }
}

function classify(q: string): { type: Hit["type"]; chains: string[] }[] {
  const clean = q.trim();
  // Pure digits → block height. Could be any chain; probe major ones.
  if (/^\d+$/.test(clean)) {
    return [{ type: "block", chains: [...UTXO_CHAINS, ...EVM_CHAINS] }];
  }
  // 0x + 64 hex → EVM tx or block hash
  if (/^0x[0-9a-fA-F]{64}$/.test(clean)) {
    return [
      { type: "transaction", chains: EVM_CHAINS },
      { type: "block", chains: EVM_CHAINS },
    ];
  }
  // 0x + 40 hex → EVM address
  if (/^0x[0-9a-fA-F]{40}$/.test(clean)) {
    return [{ type: "address", chains: EVM_CHAINS }];
  }
  // Bare 64 hex → UTXO tx or block hash
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return [
      { type: "transaction", chains: UTXO_CHAINS },
      { type: "block", chains: UTXO_CHAINS },
    ];
  }
  // Otherwise treat as address; probe UTXO + a few non-EVM L1s
  return [
    {
      type: "address",
      chains: [...UTXO_CHAINS, "solana", "tron", "ripple", "stellar", "cardano", "monero"],
    },
  ];
}

export const smartSearch = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string }) => ({ q: z.string().trim().min(1).max(200).parse(input.q) }))
  .handler(async ({ data }) => {
    const q = data.q.trim();
    const plan = classify(q);
    const tasks: Promise<Hit | null>[] = [];
    for (const { type, chains } of plan) {
      for (const chain of chains) tasks.push(probe(chain, type, q));
    }
    try {
      const settled = await Promise.all(tasks);
      const results = settled.filter((r): r is Hit => r !== null);
      return { query: q, results };
    } catch (err) {
      return { query: q, results: [] as Hit[], error: (err as Error).message };
    }
  });
