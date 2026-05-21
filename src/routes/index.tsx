import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAllStats } from "@/lib/blockchair.functions";
import { CHAINS } from "@/lib/chains";
import { GlobalSearch } from "@/components/global-search";
import { formatNumber, formatUsd } from "@/lib/format";

const statsQuery = queryOptions({
  queryKey: ["all-stats"],
  queryFn: () => getAllStats(),
  staleTime: 30_000,
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

function HomePage() {
  const { data: stats } = useSuspenseQuery(statsQuery);

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

      {/* Featured chains */}
      <section className="mt-16">
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

      {/* What you can do */}
      <section className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { t: "Search anything", d: "Paste a tx hash, address, block hash, or height. We figure out which chain." },
          { t: "Per-chain dashboards", d: "Live price, market cap, blocks, mempool, fees, and latest activity." },
          { t: "Deep details", d: "Inspect block contents, transaction inputs/outputs, and address history." },
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
