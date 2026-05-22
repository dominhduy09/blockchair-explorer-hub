import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  getChainStats,
  getBlocksList,
  getTransactionsList,
} from "@/lib/blockchair.functions";


import { getChain, isValidChain } from "@/lib/chains";
import { CopyHash } from "@/components/copy-hash";
import { formatNumber, formatUsd, relativeTime } from "@/lib/format";

const chainStatsQuery = (chain: string) =>
  queryOptions({
    queryKey: ["chain-stats", chain] as const,
    queryFn: () => getChainStats({ data: { chain } }),
    staleTime: 30_000,
  });

const blocksListQuery = (chain: string) =>
  queryOptions({
    queryKey: ["blocks-list", chain] as const,
    queryFn: () => getBlocksList({ data: { chain, limit: 10 } }),
    staleTime: 30_000,
  });

const txListQuery = (chain: string, mempool: boolean) =>
  queryOptions({
    queryKey: ["tx-list", chain, mempool] as const,
    queryFn: () => getTransactionsList({ data: { chain, mempool, limit: 10 } }),
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
  loader: ({ params, context }) => {
    context.queryClient.ensureQueryData(chainStatsQuery(params.chain));
    // fire-and-forget for streaming
    context.queryClient.prefetchQuery(blocksListQuery(params.chain));
    context.queryClient.prefetchQuery(txListQuery(params.chain, false));
    context.queryClient.prefetchQuery(txListQuery(params.chain, true));
  },
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
        <Link
          to="/$chain/nodes"
          params={{ chain }}
          className="ml-auto rounded-md border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/60"
        >
          Network nodes →
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statBlocks.map((b) => (
          <div key={b.label} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{b.label}</div>
            <div className="mt-1 font-mono text-lg text-foreground">{b.value}</div>
          </div>
        ))}
      </div>

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

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentBlocks chain={chain} />
        <RecentTransactions chain={chain} />
      </section>

      <section className="mt-4">
        <MempoolPanel chain={chain} />
      </section>

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

function RecentBlocks({ chain }: { chain: string }) {
  const { data, isLoading, error } = useQuery(blocksListQuery(chain));
  return (
    <Panel title="Latest blocks" loading={isLoading} error={error}>
      {data && data.length > 0 ? (
        <ul className="divide-y divide-border">
          {data.slice(0, 10).map((b: any) => (
            <li key={b.id ?? b.hash} className="flex items-center justify-between px-4 py-2.5">
              <Link
                to="/$chain/block/$id"
                params={{ chain, id: String(b.id ?? b.hash) }}
                className="font-mono text-sm text-primary hover:underline"
              >
                #{formatNumber(b.id)}
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatNumber(b.transaction_count)} tx</span>
                <span>{relativeTime(b.time)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No blocks available.</Empty>
      )}
    </Panel>
  );
}

function RecentTransactions({ chain }: { chain: string }) {
  const { data, isLoading, error } = useQuery(txListQuery(chain, false));
  return (
    <Panel title="Recent transactions" loading={isLoading} error={error}>
      {data && data.length > 0 ? (
        <ul className="divide-y divide-border">
          {data.slice(0, 10).map((t: any) => (
            <li key={t.hash} className="px-4 py-2.5">
              <Link
                to="/$chain/transaction/$hash"
                params={{ chain, hash: t.hash }}
                className="block truncate font-mono text-xs text-foreground hover:text-primary"
              >
                {t.hash}
              </Link>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>block #{formatNumber(t.block_id)}</span>
                <span>{relativeTime(t.time)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No recent transactions.</Empty>
      )}
    </Panel>
  );
}

function MempoolPanel({ chain }: { chain: string }) {
  const { data, isLoading, error } = useFeed(txListQuery(chain, true));
  return (
    <Panel title="Mempool (unconfirmed)" loading={isLoading} error={error}>
      {data && data.length > 0 ? (
        <ul className="divide-y divide-border">
          {data.slice(0, 10).map((t: any) => (
            <li key={t.hash} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <Link
                to="/$chain/transaction/$hash"
                params={{ chain, hash: t.hash }}
                className="truncate font-mono text-xs text-foreground hover:text-primary"
              >
                {t.hash}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t.fee != null ? `fee ${t.fee}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Mempool data is not available for this chain.</Empty>
      )}
    </Panel>
  );
}

import { useQuery } from "@tanstack/react-query";
function useFeed<T>(opts: ReturnType<typeof queryOptions<T>>) {
  return useQuery(opts);
}

function Panel({
  title,
  children,
  loading,
  error,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: unknown;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {loading && <span className="text-xs text-muted-foreground">loading…</span>}
      </div>
      {error ? (
        <div className="px-4 py-3 text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</div>;
}
