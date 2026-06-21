import type { Capability, Provider, ProviderFailure, StatsMap } from "./types";
import { ProviderError } from "./types";

const BASE = "https://api.blockchair.com";

// Conservative shape: 16–128 chars of A–Z, 0–9, _ or -.
export const BLOCKCHAIR_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

async function bcFetchRaw(
  path: string,
  params: Record<string, string | number | undefined>,
  key?: string,
) {
  const url = new URL(`${BASE}${path}`);
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      const sv = String(v);
      url.searchParams.set(k, sv);
      safe[k] = sv;
    }
  }
  if (key && BLOCKCHAIR_KEY_PATTERN.test(key)) url.searchParams.set("key", key);

  const redacted = new URL(url.toString());
  redacted.searchParams.delete("key");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "lovable-blockchair-explorer/1.0" },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not json
  }
  if (!res.ok) {
    const upstream =
      json?.context?.error ||
      (typeof json?.data === "string" ? json.data : null) ||
      text?.slice(0, 200) ||
      `HTTP ${res.status}`;
    const failure: ProviderFailure = {
      provider: "blockchair",
      status: res.status,
      url: redacted.toString(),
      path,
      params: safe,
      upstreamMessage: upstream,
      message: `Blockchair ${res.status}: ${upstream}`,
    };
    throw new ProviderError(failure);
  }
  return json;
}

export const blockchairProvider: Provider = {
  id: "blockchair",
  label: "Blockchair",
  supports(cap: Capability) {
    return cap === "stats" || cap === "block" || cap === "transaction" || cap === "address" || cap === "portfolio";
  },
  async getAllStats({ key }) {
    const out = await bcFetchRaw("/stats", {}, key);
    return (out?.data ?? {}) as StatsMap;
  },
  async validateKey(key) {
    const out = await bcFetchRaw("/stats", {}, key);
    const info = out?.context?.api ?? {};
    return {
      ok: true,
      info: {
        plan: info?.current_plan ?? null,
        remainingRequests: info?.requests_left ?? info?.remaining_requests ?? null,
      },
    };
  },
};

// Re-export low-level fetch for the existing single-purpose endpoints
// (block, transaction, address, news, etc.) that still call Blockchair directly.
export { bcFetchRaw };
