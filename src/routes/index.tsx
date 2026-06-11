import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAllStats, type BlockchairFailure } from "@/lib/blockchair.functions";
import { CHAINS } from "@/lib/chains";
import { GlobalSearch } from "@/components/global-search";
import { formatNumber, formatUsd } from "@/lib/format";

type StatsResult = { data: Record<string, any>; error: BlockchairFailure | null };

const statsQuery = queryOptions<StatsResult>({
  queryKey: ["all-stats"],
  queryFn: async () => {
    // getAllStats returns { data, error } and never throws — see blockchair.functions.ts
    return (await getAllStats()) as StatsResult;
  },
  staleTime: 30_000,
  retry: false,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "chainscope — multi-chain block explorer" },
      { name: "description", content: "Search and browse blocks, transactions, and addresses across 40+ blockchains." },
      { property: "og:title", content: "chainscope" },
      { property: "og:description", content: "Multi-chain block explorer." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: HomePage,
});

const FEATURED = ["bitcoin", "ethereum", "solana", "tron", "ripple", "bnb", "polygon", "litecoin"];

const FEATURE_MAP: { to: string; title: string; desc: string; endpoint: string }[] = [
  { to: "/", title: "Global dashboard", desc: "Live stats and market comparison across all supported chains.", endpoint: "GET /stats" },
  { to: "/chains", title: "Chain directory", desc: "Browse every chain Blockchair lists, grouped by category.", endpoint: "static + /stats" },
  { to: "/$chain", title: "Per-chain explorer", desc: "Price, mempool, blocks, fees, and latest activity per chain.", endpoint: "GET /{chain}/stats" },
  { to: "/$chain/block/$id", title: "Block inspector", desc: "Full block payload with transactions and miner data.", endpoint: "GET /{chain}/dashboards/block/{id}" },
  { to: "/$chain/transaction/$hash", title: "Transaction + privacy-o-meter", desc: "Decoded tx with inputs, outputs, fees and privacy score.", endpoint: "GET /{chain}/dashboards/transaction/{hash}" },
  { to: "/$chain/address/$addr", title: "Address dashboard", desc: "Balance, tx history, UTXOs for any address.", endpoint: "GET /{chain}/dashboards/address/{addr}" },
  { to: "/$chain/nodes", title: "Network nodes", desc: "Connected nodes, versions, and geographic spread.", endpoint: "GET /{chain}/nodes" },
  { to: "/analytics", title: "Analytics lab", desc: "Custom Infinitable queries with filters, sorts, and aggregations.", endpoint: "GET /{chain}/{table}?q=&s=&aggregate=" },
  { to: "/portfolio", title: "Multi-chain portfolio", desc: "Track addresses across chains with totals in USD.", endpoint: "GET /multi/dashboards/addresses/{list}" },
  { to: "/news", title: "Crypto news feed", desc: "Aggregated crypto news pulled from Blockchair's news endpoint.", endpoint: "GET /news" },
  { to: "/tools", title: "Tools", desc: "Suggest transactions, decode raw tx, convert hash formats.", endpoint: "GET /{chain}/tools/*" },
  { to: "/broadcast", title: "Broadcast transaction", desc: "Push a signed raw transaction to the network.", endpoint: "POST /{chain}/push/transaction" },
];

function HomePage() {
  const { data: result } = useSuspenseQuery(statsQuery);
  const stats = result.data;
  const statsError = result.error;


  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="font-mono text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="text-primary">$</span> chainscope
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          A clean, fast block explorer for{" "}
          <span className="text-foreground">{CHAINS.length}+ blockchains</span>. Search any tx
          hash, address, or block.
        </p>
        <div className="mt-8">
          <GlobalSearch autoFocus />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Try <code className="text-foreground">bitcoin</code>, an Ethereum address, or a tx hash.
        </p>
      </section>

      {/* Unsupported banner */}
      <div
        role="status"
        className="mx-auto mt-8 max-w-3xl rounded-md border border-dashed border-yellow-500/40 bg-yellow-500/5 px-4 py-3 text-center text-xs text-yellow-200/90"
      >
        <span className="font-mono font-semibold text-yellow-300">Heads up:</span> Only{" "}
        {CHAINS.filter((c) => c.supported).length} of {CHAINS.length} chains are currently served by the
        Blockchair API. EVM chains and a few others are listed but{" "}
        <Link to="/chains" className="underline hover:text-yellow-100">marked N/A</Link>.
      </div>

      {/* Feature map */}
      <section className="mt-12 sm:mt-16">
        <h2 className="mb-1 font-mono text-lg font-semibold">What this site does</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Every Blockchair API capability is wired to a dedicated route.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_MAP.map((f) => (
            <a
              key={f.title}
              href={f.to.replace("$chain", "bitcoin").replace("$id", "latest").replace("$hash", "demo").replace("$addr", "demo")}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/60"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary">
                  {f.title}
                </span>
                <code className="text-[10px] text-muted-foreground">{f.to}</code>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{f.desc}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {f.endpoint}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Featured chains */}
      <section className="mt-12 sm:mt-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-mono text-lg font-semibold">Featured chains</h2>
          <Link to="/chains" className="text-sm text-muted-foreground hover:text-primary">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED.map((slug) => {
            const chain = CHAINS.find((c) => c.slug === slug);
            if (!chain) return null;
            const s = stats?.[slug]?.data ?? stats?.[slug] ?? null;
            return (
              <Link
                key={slug}
                to="/$chain"
                params={{ chain: slug }}
                className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/60 hover:bg-card/80"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: chain.color }}
                    />
                    <span className="font-mono font-semibold">{chain.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{chain.ticker}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Price</div>
                    <div className="font-mono text-foreground">{formatUsd(s?.market_price_usd)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Blocks</div>
                    <div className="font-mono text-foreground">{formatNumber(s?.blocks)}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Market comparison */}
      <MarketComparison stats={stats} error={statsError} />


      {/* What you can do */}
      <section className="mt-12 sm:mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { t: "Search anything", d: "Paste a tx hash, address, block hash, or height. We figure out which chain." },
          { t: "Per-chain dashboards", d: "Live price, market cap, blocks, mempool, fees, and latest activity." },
          { t: "Analytics lab", d: "Run custom infinitable queries: filter, sort, aggregate across chains." },
        ].map((c) => (
          <div key={c.t} className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-mono text-sm font-semibold text-primary">{c.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

type SortKey = "market_cap_usd" | "market_price_usd" | "transactions_24h" | "hashrate_24h" | "difficulty" | "blocks";

function MarketComparison({ stats, error }: { stats: any; error: BlockchairFailure | null }) {
  const [sortBy, setSortBy] = useState<SortKey>("market_cap_usd");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows = CHAINS.map((c) => {
    const s = stats?.[c.slug]?.data ?? stats?.[c.slug] ?? null;
    return {
      chain: c,
      market_price_usd: num(s?.market_price_usd),
      market_cap_usd: num(s?.market_cap_usd),
      transactions_24h: num(s?.transactions_24h),
      hashrate_24h: num(s?.hashrate_24h),
      difficulty: num(s?.difficulty),
      blocks: num(s?.blocks),
    };
  }).filter((r) => r.market_price_usd !== null || r.blocks !== null);

  rows.sort((a, b) => {
    const av = (a[sortBy] as number | null) ?? -Infinity;
    const bv = (b[sortBy] as number | null) ?? -Infinity;
    return dir === "desc" ? bv - av : av - bv;
  });

  const click = (k: SortKey) => {
    if (sortBy === k) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSortBy(k);
      setDir("desc");
    }
  };

  const Th = ({ k, label, right = true }: { k: SortKey; label: string; right?: boolean }) => (
    <th
      onClick={() => click(k)}
      className={`cursor-pointer select-none px-3 py-2 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground ${
        right ? "text-right" : "text-left"
      }`}
    >
      {label} {sortBy === k ? (dir === "desc" ? "↓" : "↑") : ""}
    </th>
  );

  return (
    <section className="mt-12 sm:mt-16">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-mono text-lg font-semibold">Market comparison</h2>
          <p className="text-xs text-muted-foreground">Sort across price, market cap, 24h volume, hashrate, difficulty.</p>
        </div>
        <Link to="/analytics" className="text-sm text-muted-foreground hover:text-primary">
          Analytics lab →
        </Link>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-3 space-y-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive-foreground"
        >
          <div>
            <span className="font-mono font-semibold">Stats unavailable</span>{" "}
            <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-mono">
              HTTP {error.status || "—"}
            </span>{" "}
            {/rate limit|too many requests|429/i.test(error.upstreamMessage) || error.status === 429
              ? "— Blockchair rate limit reached. Add your own API key (top-right) to restore the table."
              : `— ${error.upstreamMessage}`}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <dt>endpoint</dt>
            <dd className="break-all text-foreground">{error.path}</dd>
            <dt>url</dt>
            <dd className="break-all text-foreground">{error.url}</dd>
            <dt>params</dt>
            <dd className="break-all text-foreground">
              {Object.keys(error.params).length === 0 ? "—" : JSON.stringify(error.params)}
            </dd>
            <dt>upstream</dt>
            <dd className="break-words text-foreground">{error.upstreamMessage}</dd>
          </dl>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-muted/20">
            <tr>
              <th className="px-3 py-2 text-left font-mono text-xs font-semibold text-muted-foreground">Chain</th>
              <Th k="market_price_usd" label="Price" />
              <Th k="market_cap_usd" label="Mkt cap" />
              <Th k="transactions_24h" label="Tx 24h" />
              <Th k="hashrate_24h" label="Hashrate 24h" />
              <Th k="difficulty" label="Difficulty" />
              <Th k="blocks" label="Blocks" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ chain, ...m }) => (
              <tr key={chain.slug} className="border-b border-border/60 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Link
                    to="/$chain"
                    params={{ chain: chain.slug }}
                    className="flex items-center gap-2 text-foreground hover:text-primary"
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chain.color }} />
                    <span className="font-mono">{chain.name}</span>
                    <span className="text-xs text-muted-foreground">{chain.ticker}</span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatUsd(m.market_price_usd)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUsd(m.market_cap_usd)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(m.transactions_24h)}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatCompact(m.hashrate_24h)}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatCompact(m.difficulty)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(m.blocks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function formatCompact(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1e18) return `${(n / 1e18).toFixed(2)}E`;
  if (n >= 1e15) return `${(n / 1e15).toFixed(2)}P`;
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString();
}
