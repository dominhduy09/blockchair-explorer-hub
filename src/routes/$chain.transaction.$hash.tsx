import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getTransaction, getRawTransaction } from "@/lib/blockchair.functions";
import { getChain, isValidChain } from "@/lib/chains";
import { CopyHash } from "@/components/copy-hash";
import { formatNumber, relativeTime } from "@/lib/format";

const searchSchema = z.object({
  privacy: z.boolean().catch(false),
  raw: z.boolean().catch(false),
});

const txQuery = (chain: string, hash: string, privacy: boolean) =>
  queryOptions({
    queryKey: ["tx", chain, hash, { privacy }],
    queryFn: () => getTransaction({ data: { chain, hash, privacy } }),
    staleTime: 60_000,
  });

const rawTxQuery = (chain: string, hash: string) =>
  queryOptions({
    queryKey: ["tx-raw", chain, hash],
    queryFn: () => getRawTransaction({ data: { chain, hash } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/$chain/transaction/$hash")({
  validateSearch: searchSchema,
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
  loaderDeps: ({ search }: { search: { privacy: boolean } }) => ({ privacy: search.privacy }),
  loader: ({ params, deps, context }) =>
    context.queryClient.ensureQueryData(txQuery(params.chain, params.hash, deps.privacy)),
  component: TxPage,
});

function TxPage() {
  const { chain, hash } = Route.useParams();
  const { privacy, raw } = Route.useSearch();
  const navigate = Route.useNavigate();
  const meta = getChain(chain)!;
  const { data } = useSuspenseQuery(txQuery(chain, hash, privacy));

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

  const privacyScore: number | null =
    tx["privacy-o-meter-score"] ?? tx.privacy_o_meter_score ?? entry?.["privacy-o-meter-score"] ?? null;
  const privacyChecks = entry?.["privacy-o-meter-checks"] ?? entry?.privacy_o_meter_checks ?? null;

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

      <div className="mt-4 flex flex-wrap gap-2">
        <Toggle
          on={privacy}
          onClick={() => navigate({ search: { privacy: !privacy, raw } })}
          label="Privacy-o-meter"
        />
        <Toggle
          on={raw}
          onClick={() => navigate({ search: { privacy, raw: !raw } })}
          label="Raw data"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="rounded-md border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</div>
            <div className="mt-1 text-foreground">{f.value}</div>
          </div>
        ))}
      </div>

      {privacy && (
        <section className="mt-8 rounded-md border border-border bg-card p-5">
          <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Privacy-o-meter
          </h2>
          {privacyScore != null ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-3xl text-foreground">{privacyScore}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, Number(privacyScore)))}%` }}
                />
              </div>
              {privacyChecks && (
                <pre className="mt-4 overflow-x-auto rounded bg-background/50 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(privacyChecks, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Privacy score not available for this transaction or chain.
            </p>
          )}
        </section>
      )}

      {raw && <RawPanel chain={chain} hash={hash} />}

      {(inputs.length > 0 || outputs.length > 0) && (
        <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IOList title={`Inputs (${inputs.length})`} items={inputs} chain={chain} />
          <IOList title={`Outputs (${outputs.length})`} items={outputs} chain={chain} />
        </section>
      )}
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 font-mono text-xs ${
        on
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {on ? "✓ " : ""}{label}
    </button>
  );
}

function RawPanel({ chain, hash }: { chain: string; hash: string }) {
  const { data, isLoading, error } = useQuery(rawTxQuery(chain, hash));
  return (
    <section className="mt-8 rounded-md border border-border bg-card p-5">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
        Raw transaction
      </h2>
      {isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading raw data…</p>}
      {error && (
        <p className="mt-2 text-sm text-destructive">{(error as Error).message}</p>
      )}
      {data && (
        <pre className="mt-3 max-h-96 overflow-auto rounded bg-background/50 p-3 text-xs text-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
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
