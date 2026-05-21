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

// ---- Smart search: figure out what a query is and where to send the user ----
export const smartSearch = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string }) => ({ q: z.string().trim().min(1).max(200).parse(input.q) }))
  .handler(async ({ data }) => {
    const q = data.q.trim();
    try {
      const out = await bcFetch(`/search`, { q });
      // Blockchair's /search returns { data: { <chain>: { ... } } } or similar.
      // Normalize to a list of { chain, type, query } suggestions.
      const results: { chain: string; type: string; query: string }[] = [];
      const d = out?.data ?? {};
      for (const [chain, blob] of Object.entries<any>(d)) {
        if (!blob || typeof blob !== "object") continue;
        for (const [type, value] of Object.entries<any>(blob)) {
          if (value == null) continue;
          if (Array.isArray(value)) {
            for (const v of value) results.push({ chain, type, query: String(v) });
          } else {
            results.push({ chain, type, query: String(value) });
          }
        }
      }
      return { query: q, results };
    } catch (err) {
      return { query: q, results: [], error: (err as Error).message };
    }
  });
