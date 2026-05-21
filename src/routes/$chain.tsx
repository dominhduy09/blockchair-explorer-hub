import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getChainStats } from "@/lib/blockchair.functions";
import { getChain, isValidChain } from "@/lib/chains";
import { CopyHash } from "@/components/copy-hash";
import { formatNumber, formatUsd, relativeTime } from "@/lib/format";

const chainStatsQuery = (chain: string) =>
  queryOptions({
    queryKey: ["chain-stats", chain],
    queryFn: () => getChainStats({ data: { chain } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/$chain")({
  head: ({ params }) => {
    const c = getChain(params.chain);
    const name = c?.name ?? params.chain;
    return {
      meta: [
        { title: `${name} explorer — chainscope` },
        { name: "description", content: `Live ${name} stats, latest blocks, and recent transactions.` },
        { property: "og:title", content: `${name} explorer — chainscope` },
        { property: "og:description", content: `Live ${name} stats and activity.` },
      ],
    };
  },
  beforeLoad: ({ params }) => {
    if (!isValidChain(params.chain)) throw notFound();
  },
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(chainStatsQuery(params.chain)),
  component: ChainPage,
});

function ChainPage() {
  const { chain } = Route.useParams();
  const meta = getChain(chain)!;
  const { data: stats } = useSuspenseQuery(chainStatsQuery(chain));

  const s: any = stats ?? {};

  const statBlocks = [
    { label: "Price", value: formatUsd(s.market_price_usd) },
    { label: "Market cap", value: formatUsd(s.market_cap_usd) },
    { label: "Blocks", value: formatNumber(s.blocks) },
    { label: "Transactions", value: formatNumber(s.transactions) },
    { label: "Mempool", value: formatNumber(s.mempool_transactions) },
    { label: "Difficulty", value: formatNumber(s.difficulty, 2) },
    { label: "Hashrate (24h)", value: s.hashrate_24h ? `${formatNumber(Number(s.hashrate_24h) / 1e12, 2)} TH/s` : "—" },
    { label: "Avg fee (USD)", value: formatUsd(s.average_transaction_fee_usd_24h) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <span
          className="inline-block h-4 w-4 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <h1 className="font-mono text-3xl font-bold">{meta.name}</h1>
        <span className="rounded border border-border bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {meta.ticker}
        </span>
        <span className="text-xs text-muted-foreground">/{chain}</span>
      </div>

      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statBlocks.map((b) => (
          <div key={b.label} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{b.label}</div>
            <div className="mt-1 font-mono text-lg text-foreground">{b.value}</div>
          </div>
        ))}
      </div>

      {/* Latest block summary */}
      {s.best_block_hash && (
        <section className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Latest block
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Height</div>
              <Link
                to="/$chain/block/$id"
                params={{ chain, id: String(s.best_block_height) }}
                className="font-mono text-lg text-primary hover:underline"
              >
                #{formatNumber(s.best_block_height)}
              </Link>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Hash</div>
              <CopyHash value={s.best_block_hash} truncate />
              <div className="mt-1 text-xs text-muted-foreground">
                {relativeTime(s.best_block_time)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick lookups */}
      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Look up on {meta.name}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the search bar above to look up any block height/hash, transaction hash, or address on this chain.
        </p>
      </section>

      {/* Raw stats (collapsed pretty list) */}
      <details className="mt-8 rounded-lg border border-border bg-card p-5">
        <summary className="cursor-pointer font-mono text-sm text-muted-foreground hover:text-foreground">
          Raw chain stats
        </summary>
        <pre className="mt-3 overflow-x-auto rounded bg-background p-3 text-xs text-muted-foreground">
{JSON.stringify(stats, null, 2)}
        </pre>
      </details>
    </div>
  );
}
