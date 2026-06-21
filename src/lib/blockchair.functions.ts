import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { CHAIN_SLUGS } from "./chains";
import {
  BLOCKCHAIR_KEY_PATTERN,
  KEY_PATTERNS,
  isValidKeyShape,
} from "./api-key-store";
import { PROVIDERS } from "./providers/registry";
import { routeAllStats, type Keys } from "./providers/router";
import type { ProviderFailure, ProviderId } from "./providers/types";
import { ProviderError } from "./providers/types";

const BASE = "https://api.blockchair.com";

const chainSchema = z.enum(CHAIN_SLUGS as [string, ...string[]]);

// Back-compat alias for callers that still import BlockchairFailure.
export type BlockchairFailure = ProviderFailure;

export class BlockchairError extends Error {
  failure: BlockchairFailure;
  constructor(failure: BlockchairFailure) {
    super(failure.message);
    this.name = "BlockchairError";
    this.failure = failure;
  }
}

// Reads the per-user Blockchair key from the request header attached by
// `attachBlockchairKey`. Falls back to the project-default env key.
function resolveApiKey(override?: string): string | undefined {
  if (override && BLOCKCHAIR_KEY_PATTERN.test(override)) return override;
  try {
    const header = getRequestHeader("x-blockchair-key");
    if (header && BLOCKCHAIR_KEY_PATTERN.test(header)) return header;
  } catch {
    // not inside a request context
  }
  return process.env.BLOCKCHAIR_API_KEY || undefined;
}

// Reads all per-provider keys from request headers (shape-validated).
function resolveAllKeys(): Keys {
  const keys: Keys = {};
  const ids: ProviderId[] = ["blockchair", "blockscout", "etherscan", "covalent"];
  for (const id of ids) {
    try {
      const h = getRequestHeader(`x-${id}-key`);
      if (h && KEY_PATTERNS[id].test(h)) keys[id] = h;
    } catch {
      // not in a request
    }
  }
  if (!keys.blockchair && process.env.BLOCKCHAIR_API_KEY) {
    keys.blockchair = process.env.BLOCKCHAIR_API_KEY;
  }
  return keys;
}

function resolvePrimary(): ProviderId | undefined {
  try {
    const h = getRequestHeader("x-provider-primary");
    if (h === "blockchair" || h === "blockscout" || h === "etherscan" || h === "covalent") {
      return h;
    }
  } catch {
    // not in a request
  }
  return undefined;
}

async function bcFetch(
  path: string,
  params: Record<string, string | number | undefined> = {},
  init: RequestInit = {},
  keyOverride?: string,
) {
  const key = resolveApiKey(keyOverride);
  const url = new URL(`${BASE}${path}`);
  const safeParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      const sv = String(v);
      url.searchParams.set(k, sv);
      safeParams[k] = sv;
    }
  }
  if (key) url.searchParams.set("key", key);

  // Build a redacted URL for diagnostics (never include the API key)
  const redacted = new URL(url.toString());
  redacted.searchParams.delete("key");

  const res = await fetch(url.toString(), {
    ...init,
    headers: { "User-Agent": "lovable-blockchair-explorer/1.0", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  if (!res.ok) {
    const upstream =
      json?.context?.error ||
      (typeof json?.data === "string" ? json.data : null) ||
      text?.slice(0, 200) ||
      `Upstream error ${res.status}`;
    throw new BlockchairError({
      provider: "blockchair",
      status: res.status,
      url: redacted.toString(),
      path,
      params: safeParams,
      upstreamMessage: upstream,
      message: `Blockchair ${res.status}: ${upstream}`,
    });
  }
  return json;
}

// ============================================================================
// API key validation (generic across providers + back-compat wrapper)
// ============================================================================

const providerIdSchema = z.enum(["blockchair", "blockscout", "etherscan", "covalent"]);

export const validateProviderKey = createServerFn({ method: "POST" })
  .inputValidator((input: { provider: string; key: string }) => ({
    provider: providerIdSchema.parse(input.provider),
    key: z.string().trim().min(1).max(256).parse(input.key),
  }))
  .handler(async ({ data }) => {
    const p = PROVIDERS[data.provider];
    if (!p.validateKey) {
      return { valid: false, error: `${p.label} does not require a key.` };
    }
    if (!isValidKeyShape(data.provider, data.key)) {
      return { valid: false, error: "Key format does not match this provider." };
    }
    try {
      const res = await p.validateKey(data.key);
      return { valid: true, info: res.info ?? null };
    } catch (e) {
      const msg = e instanceof ProviderError ? e.failure.message : (e as Error).message;
      return { valid: false, error: msg };
    }
  });

export const validateBlockchairKey = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string }) => ({
    key: z.string().trim().regex(BLOCKCHAIR_KEY_PATTERN, "Invalid key format").parse(input.key),
  }))
  .handler(async ({ data }) => {
    try {
      const out = await bcFetch("/stats", {}, {}, data.key);
      const ctx = out?.context ?? {};
      const info = ctx?.api ?? {};
      return {
        valid: true,
        plan: info?.["current_plan"] ?? null,
        remainingRequests: info?.["requests_left"] ?? info?.["remaining_requests"] ?? null,
        serverTime: ctx?.server_time ?? null,
      };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  });

// ============================================================================
// Stats — multi-provider with auto-fallback
// ============================================================================

export type GetAllStatsResult = {
  data: Record<string, any>;
  provider: ProviderId | null;
  failures: ProviderFailure[];
  // Back-compat: first failure, or null. Existing UI reads this.
  error: ProviderFailure | null;
};

export const getAllStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<GetAllStatsResult> => {
    const keys = resolveAllKeys();
    const primary = resolvePrimary();
    const result = await routeAllStats(primary, keys);
    return {
      data: result.data as Record<string, any>,
      provider: result.provider,
      failures: result.failures,
      error: result.failures[0] ?? null,
    };
  },
);


export const getChainStats = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string }) => ({ chain: chainSchema.parse(input.chain) }))
  .handler(async ({ data }) => {
    const out = await bcFetch(`/${data.chain}/stats`);
    return out?.data ?? null;
  });

// ============================================================================
// Block + Transaction + Address dashboards
// ============================================================================

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

export const getTransaction = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string; hash: string; privacy?: boolean }) => ({
    chain: chainSchema.parse(input.chain),
    hash: z.string().min(1).max(200).parse(input.hash),
    privacy: Boolean(input.privacy),
  }))
  .handler(async ({ data }) => {
    const params: Record<string, string> = {};
    if (data.privacy) params["privacy-o-meter"] = "true";
    const out = await bcFetch(
      `/${data.chain}/dashboards/transaction/${encodeURIComponent(data.hash)}`,
      params,
    );
    return out ?? null;
  });

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

// ============================================================================
// Infinitable lists: latest blocks, latest / mempool transactions
// ============================================================================

const limitSchema = z.number().int().min(1).max(100).default(20);

export const getBlocksList = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string; limit?: number }) => ({
    chain: chainSchema.parse(input.chain),
    limit: limitSchema.parse(input.limit ?? 20),
  }))
  .handler(async ({ data }) => {
    const out = await bcFetch(`/${data.chain}/blocks`, { limit: data.limit });
    return (out?.data ?? []) as any[];
  });

export const getTransactionsList = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { chain: string; limit?: number; mempool?: boolean }) => ({
      chain: chainSchema.parse(input.chain),
      limit: limitSchema.parse(input.limit ?? 20),
      mempool: Boolean(input.mempool),
    }),
  )
  .handler(async ({ data }) => {
    const path = data.mempool
      ? `/${data.chain}/mempool/transactions`
      : `/${data.chain}/transactions`;
    const out = await bcFetch(path, { limit: data.limit });
    return (out?.data ?? []) as any[];
  });

// ============================================================================
// Nodes
// ============================================================================

export const getNodes = createServerFn({ method: "GET" })
  .inputValidator((input: { chain?: string }) => ({
    chain: input.chain ? chainSchema.parse(input.chain) : undefined,
  }))
  .handler(async ({ data }) => {
    const out = await bcFetch(data.chain ? `/${data.chain}/nodes` : `/nodes`);
    return out?.data ?? null;
  });

// ============================================================================
// Multi-chain portfolio
// ============================================================================

const addressEntrySchema = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[a-z0-9-]+:[A-Za-z0-9]+$/, "Use blockchain:address format");

export const getMultiAddresses = createServerFn({ method: "GET" })
  .inputValidator((input: { addresses: string[] }) => ({
    addresses: z.array(addressEntrySchema).min(1).max(100).parse(input.addresses),
  }))
  .handler(async ({ data }) => {
    const joined = data.addresses.join(",");
    const out = await bcFetch(`/multi/dashboards/addresses/${encodeURIComponent(joined)}`);
    return out?.data ?? null;
  });

// ============================================================================
// Broadcast raw transaction
// ============================================================================

const BROADCAST_CHAINS = [
  "bitcoin",
  "bitcoin-cash",
  "ethereum",
  "litecoin",
  "dogecoin",
  "dash",
  "groestlcoin",
  "zcash",
] as const;

export const broadcastTx = createServerFn({ method: "POST" })
  .inputValidator((input: { chain: string; data: string }) => ({
    chain: z.enum(BROADCAST_CHAINS).parse(input.chain),
    raw: z.string().min(2).max(200_000).parse(input.data),
  }))
  .handler(async ({ data }) => {
    const body = new URLSearchParams({ data: data.raw });
    const out = await bcFetch(
      `/${data.chain}/push/transaction`,
      {},
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    return out ?? null;
  });

// ============================================================================
// News
// ============================================================================

const NEWS_LANGS = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "nl",
  "ru",
  "tr",
  "ar",
  "fa",
  "jp",
  "ko",
  "zh",
] as const;

export const getNews = createServerFn({ method: "GET" })
  .inputValidator((input: { language?: string; limit?: number }) => ({
    language: z.enum(NEWS_LANGS).default("en").parse(input.language ?? "en"),
    limit: limitSchema.parse(input.limit ?? 30),
  }))
  .handler(async ({ data }) => {
    const out = await bcFetch(`/news`, {
      q: `language(${data.language})`,
      limit: data.limit,
    });
    return (out?.data ?? []) as any[];
  });

// ============================================================================
// Tools: halvening countdown, available ranges
// ============================================================================

export const getHalvening = createServerFn({ method: "GET" }).handler(async () => {
  const out = await bcFetch(`/tools/halvening`);
  return out?.data ?? {};
});

export const getRange = createServerFn({ method: "GET" }).handler(async () => {
  const out = await bcFetch(`/range`);
  return out?.data ?? {};
});

// ============================================================================
// Raw block / transaction
// ============================================================================

export const getRawBlock = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string; id: string }) => ({
    chain: chainSchema.parse(input.chain),
    id: z.string().min(1).max(200).parse(input.id),
  }))
  .handler(async ({ data }) => {
    const out = await bcFetch(`/${data.chain}/raw/block/${encodeURIComponent(data.id)}`);
    return out?.data ?? null;
  });

export const getRawTransaction = createServerFn({ method: "GET" })
  .inputValidator((input: { chain: string; hash: string }) => ({
    chain: chainSchema.parse(input.chain),
    hash: z.string().min(1).max(200).parse(input.hash),
  }))
  .handler(async ({ data }) => {
    const out = await bcFetch(`/${data.chain}/raw/transaction/${encodeURIComponent(data.hash)}`);
    return out?.data ?? null;
  });

// ============================================================================
// Infinitable analytics queries
// ============================================================================

const INFINITABLE_TABLES = [
  "blocks",
  "transactions",
  "outputs",
  "mempool/transactions",
  "mempool/outputs",
  "uncles",
  "calls",
  "addresses",
] as const;

function normalizeAggregateSyntax(aggregate?: string) {
  const raw = aggregate?.trim();
  if (!raw) return undefined;

  if (!raw.includes("|")) return raw;

  const [metricsPart, groupsPart] = raw.split("|", 2);
  const metrics = metricsPart
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const groups = groupsPart
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return [...groups, ...metrics].join(",");
}

function getAggregateSortableFields(aggregate?: string) {
  const normalized = normalizeAggregateSyntax(aggregate);
  if (!normalized) return [];

  return normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeAggregateSort(sort?: string, aggregate?: string) {
  const rawSort = sort?.trim();
  if (!rawSort) return undefined;

  const sortableFields = getAggregateSortableFields(aggregate);
  if (sortableFields.length === 0) return rawSort;

  const sortClauses = rawSort
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((clause) => {
      const match = clause.match(/^(.*)\((asc|desc)\)$/i);
      if (!match) return clause;

      const field = match[1]?.trim() ?? "";
      const direction = match[2].toLowerCase();
      if (!field) return clause;

      const exact = sortableFields.find((candidate) => candidate === field);
      if (exact) return `${exact}(${direction})`;

      const withoutTrailingCall = field.replace(/\(\)$/g, "");
      const functionMatch = sortableFields.find((candidate) => {
        const candidateBase = candidate.replace(/\(\)$/g, "");
        return candidateBase === withoutTrailingCall;
      });

      return functionMatch ? `${functionMatch}(${direction})` : clause;
    });

  return sortClauses.join(",");
}

export const runInfinitable = createServerFn({ method: "GET" })
  .inputValidator(
    (input: {
      chain: string;
      table: string;
      q?: string;
      s?: string;
      limit?: number;
      offset?: number;
      fields?: string;
      aggregate?: string;
    }) => ({
      chain: chainSchema.parse(input.chain),
      table: z.enum(INFINITABLE_TABLES).parse(input.table),
      q: z.string().max(2000).optional().parse(input.q || undefined),
      s: z.string().max(500).optional().parse(input.s || undefined),
      limit: z.number().int().min(1).max(100).default(20).parse(input.limit ?? 20),
      offset: z.number().int().min(0).max(1_000_000).default(0).parse(input.offset ?? 0),
      fields: z.string().max(1000).optional().parse(input.fields || undefined),
      aggregate: z.string().max(500).optional().parse(input.aggregate || undefined),
    }),
  )
  .handler(async ({ data }) => {
    const hasAggregate = !!data.aggregate?.trim();
    const normalizedAggregate = normalizeAggregateSyntax(data.aggregate);
    const normalizedSort = hasAggregate
      ? normalizeAggregateSort(data.s, normalizedAggregate)
      : data.s?.trim() || undefined;
    // Blockchair rejects requests mixing `aggregate` with `fields`, and the
    // sort expression must reference an aggregated column when aggregating.
    const params: Record<string, string | number | undefined> = {
      q: data.q?.trim() || undefined,
      s: normalizedSort,
      limit: data.limit,
      offset: data.offset,
    };
    if (hasAggregate) {
      params.a = normalizedAggregate;
    } else {
      params.fields = data.fields?.trim() || undefined;
    }
    const sent = {
      chain: data.chain,
      table: data.table,
      q: params.q as string | undefined,
      s: params.s as string | undefined,
      aggregate: hasAggregate ? (normalizedAggregate as string | undefined) : undefined,
      fields: hasAggregate ? undefined : (params.fields as string | undefined),
    };
    try {
      const out = await bcFetch(`/${data.chain}/${data.table}`, params);
      return {
        rows: (out?.data ?? []) as any[],
        context: out?.context ?? null,
        error: null as string | null,
        sent,
      };
    } catch (e) {
      return {
        rows: [] as any[],
        context: null,
        error: (e as Error).message,
        sent,
      };
    }
  });

// ============================================================================
// Smart search: classify query and probe candidate chains in parallel
// ============================================================================

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
    if (Array.isArray(d) && d.length === 0) return null;
    if (typeof d === "object" && Object.keys(d).length === 0) return null;
    return { chain, type, query: q };
  } catch {
    return null;
  }
}

function classify(q: string): { type: Hit["type"]; chains: string[] }[] {
  const clean = q.trim();
  if (/^\d+$/.test(clean)) {
    return [{ type: "block", chains: [...UTXO_CHAINS, ...EVM_CHAINS] }];
  }
  if (/^0x[0-9a-fA-F]{64}$/.test(clean)) {
    return [
      { type: "transaction", chains: EVM_CHAINS },
      { type: "block", chains: EVM_CHAINS },
    ];
  }
  if (/^0x[0-9a-fA-F]{40}$/.test(clean)) {
    return [{ type: "address", chains: EVM_CHAINS }];
  }
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return [
      { type: "transaction", chains: UTXO_CHAINS },
      { type: "block", chains: UTXO_CHAINS },
    ];
  }
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
