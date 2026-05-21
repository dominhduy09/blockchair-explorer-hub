import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTransaction } from "@/lib/blockchair.functions";
import { getChain, isValidChain } from "@/lib/chains";
import { CopyHash } from "@/components/copy-hash";
import { formatNumber, relativeTime } from "@/lib/format";

const txQuery = (chain: string, hash: string) =>
  queryOptions({
    queryKey: ["tx", chain, hash],
    queryFn: () => getTransaction({ data: { chain, hash } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/$chain/transaction/$hash")({
  head: ({ params }) => {
    const c = getChain(params.chain);
    return {
      meta: [
        { title: `Tx ${params.hash.slice(0, 12)}… on ${c?.name ?? params.chain} — chainscope` },
        { name: "description", content: `Transaction details on ${c?.name ?? params.chain}.` },
      ],
    };
  },
  beforeLoad: ({ params }) => {
    if (!isValidChain(params.chain)) throw notFound();
  },
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(txQuery(params.chain, params.hash)),
  component: TxPage,
});

function TxPage() {
  const { chain, hash } = Route.useParams();
  const meta = getChain(chain)!;
  const { data } = useSuspenseQuery(txQuery(chain, hash));

  const entry = data?.data ? Object.values<any>(data.data)[0] : null;
  const tx = entry?.transaction ?? null;
  const inputs: any[] = entry?.inputs ?? [];
  const outputs: any[] = entry?.outputs ?? [];

  if (!tx) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="font-mono text-2xl">Transaction not found</h1>
        <p className="mt-2 text-sm text-muted-foreground break-all">
          No tx matched <code>{hash}</code> on {meta.name}.
        </p>
        <Link to="/$chain" params={{ chain }} className="mt-6 inline-block text-primary hover:underline">
          ← Back to {meta.name}
        </Link>
      </div>
    );
  }

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Block", value: tx.block_id ? (
      <Link to="/$chain/block/$id" params={{ chain, id: String(tx.block_id) }} className="text-primary hover:underline font-mono">
        #{formatNumber(tx.block_id)}
      </Link>
    ) : "Unconfirmed" },
    { label: "Time", value: `${tx.time ?? "—"} · ${relativeTime(tx.time)}` },
    { label: "Sender", value: tx.sender ? <CopyHash value={tx.sender} truncate /> : undefined },
    { label: "Recipient", value: tx.recipient ? <CopyHash value={tx.recipient} truncate /> : undefined },
    { label: "Value", value: tx.value ?? tx.value_usd ? `${tx.value ?? "—"}${tx.value_usd ? ` ($${Number(tx.value_usd).toFixed(2)})` : ""}` : undefined },
    { label: "Fee", value: tx.fee ?? undefined },
    { label: "Fee (USD)", value: tx.fee_usd ? `$${Number(tx.fee_usd).toFixed(4)}` : undefined },
    { label: "Size", value: tx.size ? `${formatNumber(tx.size)} bytes` : undefined },
    { label: "Inputs / Outputs", value: tx.input_count != null ? `${tx.input_count} → ${tx.output_count}` : undefined },
  ].filter((f) => f.value !== undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="text-xs text-muted-foreground">
        <Link to="/$chain" params={{ chain }} className="hover:text-primary">
          {meta.name}
        </Link>
        {" / "} transaction
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="font-mono text-2xl font-bold">Transaction</h1>
        <CopyHash value={hash} truncate className="text-base" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="rounded-md border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</div>
            <div className="mt-1 text-foreground">{f.value}</div>
          </div>
        ))}
      </div>

      {(inputs.length > 0 || outputs.length > 0) && (
        <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IOList title={`Inputs (${inputs.length})`} items={inputs} chain={chain} />
          <IOList title={`Outputs (${outputs.length})`} items={outputs} chain={chain} />
        </section>
      )}
    </div>
  );
}

function IOList({ title, items, chain }: { title: string; items: any[]; chain: string }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-2 font-mono text-sm text-muted-foreground">
        {title}
      </div>
      <ul className="divide-y divide-border">
        {items.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">None</li>
        )}
        {items.slice(0, 100).map((it, i) => {
          const addr = it.recipient ?? it.sender ?? it.address ?? "—";
          return (
            <li key={i} className="px-4 py-2.5">
              {addr !== "—" ? (
                <Link
                  to="/$chain/address/$addr"
                  params={{ chain, addr }}
                  className="block font-mono text-xs text-foreground hover:text-primary"
                >
                  {addr}
                </Link>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">—</span>
              )}
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {it.value ?? ""}
                {it.value_usd ? ` · $${Number(it.value_usd).toFixed(4)}` : ""}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
