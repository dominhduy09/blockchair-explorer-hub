import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getBlock } from "@/lib/blockchair.functions";
import { getChain, isValidChain } from "@/lib/chains";
import { CopyHash } from "@/components/copy-hash";
import { formatNumber, relativeTime } from "@/lib/format";

const blockQuery = (chain: string, id: string) =>
  queryOptions({
    queryKey: ["block", chain, id],
    queryFn: () => getBlock({ data: { chain, id } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/$chain/block/$id")({
  head: ({ params }) => {
    const c = getChain(params.chain);
    return {
      meta: [
        { title: `Block ${params.id} on ${c?.name ?? params.chain} — chainscope` },
        { name: "description", content: `Block ${params.id} details on ${c?.name ?? params.chain}.` },
      ],
    };
  },
  beforeLoad: ({ params }) => {
    if (!isValidChain(params.chain)) throw notFound();
  },
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(blockQuery(params.chain, params.id)),
  component: BlockPage,
});

function BlockPage() {
  const { chain, id } = Route.useParams();
  const meta = getChain(chain)!;
  const { data } = useSuspenseQuery(blockQuery(chain, id));

  const entry = data?.data ? Object.values<any>(data.data)[0] : null;
  const block = entry?.block ?? null;
  const transactions: string[] = entry?.transactions ?? [];

  if (!block) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="font-mono text-2xl">Block not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No block matched <code>{id}</code> on {meta.name}.
        </p>
        <Link to="/$chain" params={{ chain }} className="mt-6 inline-block text-primary hover:underline">
          ← Back to {meta.name}
        </Link>
      </div>
    );
  }

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Height", value: <span className="font-mono">{formatNumber(block.id ?? block.height)}</span> },
    { label: "Hash", value: <CopyHash value={block.hash} truncate /> },
    { label: "Time", value: `${block.time ?? "—"} · ${relativeTime(block.time)}` },
    { label: "Transactions", value: formatNumber(block.transaction_count) },
    { label: "Size", value: block.size ? `${formatNumber(block.size)} bytes` : "—" },
    { label: "Weight", value: block.weight ? formatNumber(block.weight) : undefined },
    { label: "Miner / Validator", value: block.guessed_miner || block.miner || "—" },
    { label: "Difficulty", value: block.difficulty ? formatNumber(block.difficulty, 2) : undefined },
    { label: "Fees (total)", value: block.fee_total ?? undefined },
    { label: "Reward", value: block.reward ?? undefined },
  ].filter((f) => f.value !== undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="text-xs text-muted-foreground">
        <Link to="/$chain" params={{ chain }} className="hover:text-primary">
          {meta.name}
        </Link>
        {" / "} block
      </div>
      <h1 className="mt-2 font-mono text-3xl font-bold">
        Block <span className="text-primary">#{formatNumber(block.id ?? block.height)}</span>
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="rounded-md border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</div>
            <div className="mt-1 text-foreground">{f.value}</div>
          </div>
        ))}
      </div>

      {transactions.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Transactions ({transactions.length} shown)
          </h2>
          <div className="overflow-hidden rounded-md border border-border">
            <ul className="divide-y divide-border">
              {transactions.map((hash) => (
                <li key={hash} className="bg-card px-4 py-2 hover:bg-card/70">
                  <Link
                    to="/$chain/transaction/$hash"
                    params={{ chain, hash }}
                    className="font-mono text-sm text-foreground hover:text-primary"
                  >
                    {hash}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
