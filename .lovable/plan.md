
# Multi-provider blockchain data layer

Today every server function in `src/lib/blockchair.functions.ts` calls Blockchair directly. To support alternative free APIs while keeping the same UI flow, I'll introduce a thin **provider abstraction** that each chosen API implements, plus a **router** that picks the user's primary and auto-falls back to the next available provider on failure.

## Reality check on coverage

The four APIs you picked don't fully overlap with Blockchair. Honest mapping:

```text
Feature                         Blockchair  Blockscout  Etherscan  Covalent  The Graph
Multi-chain stats (homepage)    yes         partial*    no         no        no
Block by id/hash                yes         yes (EVM)   yes (ETH)  yes       no
Transaction by hash             yes         yes (EVM)   yes (ETH)  yes       no
Address dashboard + balances    yes         yes (EVM)   yes (ETH)  yes       no
UTXO chains (BTC, LTC, DOGE…)   yes         no          no         no        no
Multi-chain portfolio           yes         no          no         yes       no
News                            yes         no          no         no        no
Broadcast raw tx                yes         partial     no         no        no
Halvening / range tools         yes         no          no         no        no
Infinitable analytics           yes         no          no         no        custom subgraphs
Smart search                    yes         EVM only    ETH only   EVM only  no

* Blockscout returns per-chain stats; we aggregate client-side.
```

So **Blockchair stays the default and only provider** for UTXO chains, news, broadcast, halvening, analytics aggregates, and smart search. The alternatives slot in for **EVM stats, blocks, txs, addresses, and portfolio** — which is where the 429 rate-limit pain actually lives.

The Graph is dropped from the runtime plan: it needs per-asset subgraph queries and doesn't map to the generic "get block by id" flow. I'll note it in the settings UI as "not supported for generic lookups".

## Architecture

```text
src/lib/providers/
  types.ts              ← Provider interface + ChainQuery shape
  blockchair.ts         ← wraps existing bcFetch logic
  blockscout.ts         ← public instances, no key
  etherscan.ts          ← ETH + L2 multichain endpoint, key required
  covalent.ts           ← unified API, key required
  registry.ts           ← provider list, capability map, chain support
  router.ts             ← pickProviders(feature, chain) → ordered list
                         tryProviders(...) → first-success with logged failures
src/lib/api-key-store.ts        ← extended: per-provider key + primary selection
src/components/api-key-dialog.tsx ← extended: provider dropdown + per-provider key fields
src/lib/blockchair.functions.ts   ← keeps bcFetch; getBlock/getTransaction/getAddress/
                                    getAllStats/getMultiAddresses delegate to router
```

### Provider interface

```ts
type Capability = "stats" | "block" | "transaction" | "address" | "portfolio";

interface Provider {
  id: "blockchair" | "blockscout" | "etherscan" | "covalent";
  label: string;
  supports(cap: Capability, chain?: string): boolean;
  getStats?(): Promise<NormalizedStats>;
  getBlock?(chain: string, id: string): Promise<NormalizedBlock>;
  getTransaction?(chain: string, hash: string): Promise<NormalizedTx>;
  getAddress?(chain: string, addr: string, offset: number): Promise<NormalizedAddress>;
  getPortfolio?(addrs: string[]): Promise<NormalizedPortfolio>;
}
```

Each method throws a `ProviderError { provider, status, message, url }` on failure. The router catches and tries the next provider; if all fail, it surfaces the **list** of failures so the existing 429 notice on the homepage can show which providers were tried and why.

### Router behavior

`tryProviders(cap, chain, userPrimary, ...args)`:
1. Build ordered list: `[userPrimary, ...rest]` filtered by `supports(cap, chain)`.
2. Loop, return first success.
3. On failure, push to `failures[]` and continue.
4. If all fail, throw `AllProvidersFailed(failures)`.

### Settings UI changes

`ApiKeyDialog` becomes a small settings panel:
- **Primary provider** dropdown (Blockchair / Blockscout / Etherscan / Covalent)
- Per-provider API key input where required:
  - Blockchair: optional (existing behavior)
  - Blockscout: not required
  - Etherscan: required to use
  - Covalent: required to use
- Existing validate-key flow runs against the selected provider's `/health`-equivalent endpoint
- Stored in `localStorage` under structured keys; sent via existing client middleware as `x-<provider>-key` headers

### Failure UI

The existing `MarketComparison` 429 notice on `/` is updated to render the **multi-provider failure list**: provider, status, endpoint, upstream message. The current single-error UI becomes a list.

## What stays unchanged

- All UTXO-chain pages, analytics, news, broadcast, tools, smart-search routes — Blockchair-only.
- Routing, route files, component structure, query keys.
- The `BlockchairError`/`BlockchairFailure` shape (kept and re-exported as the canonical `ProviderError`).

## Out of scope

- Normalizing UTXO chain coverage onto other providers (none of them support BTC/LTC/DOGE).
- The Graph integration (requires per-asset subgraph IDs — no generic mapping).
- Server-side caching of responses (separate concern; bring up later if rate limits still bite after fallback).

## Build order

1. Create `providers/types.ts` and move `bcFetch` into `providers/blockchair.ts` behind the new interface.
2. Add `providers/blockscout.ts` (no key, public instance map per chain).
3. Add `providers/etherscan.ts` (multichain v2 endpoint, chainid param).
4. Add `providers/covalent.ts`.
5. Add `registry.ts` + `router.ts` with `tryProviders` + logging.
6. Rewrite `getBlock`, `getTransaction`, `getAddress`, `getAllStats`, `getMultiAddresses` in `blockchair.functions.ts` to delegate to the router. Keep the file name to avoid touching every import.
7. Extend `api-key-store.ts` and `blockchair-key-attacher.ts` for per-provider keys + primary.
8. Replace `ApiKeyDialog` content with the new settings panel.
9. Update `MarketComparison` failure notice to render a list of provider failures.
10. Smoke test: with no keys, switch primary to Blockscout, load `/ethereum/block/<id>` and homepage; force Blockscout offline, confirm Blockchair fallback fires.

If the plan looks right I'll start with steps 1–6 (the backend swap) and ping you before touching the dialog UI.
