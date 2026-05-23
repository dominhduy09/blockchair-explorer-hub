import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { runInfinitable } from "@/lib/blockchair.functions";
import { CHAINS } from "@/lib/chains";
import { useState } from "react";

const TABLES = [
  "blocks",
  "transactions",
  "outputs",
  "mempool/transactions",
  "mempool/outputs",
  "uncles",
  "calls",
  "addresses",
] as const;

const PRESETS: Array<{
  label: string;
  chain: string;
  table: (typeof TABLES)[number];
  q?: string;
  s?: string;
  limit?: number;
  fields?: string;
  aggregate?: string;
}> = [
  {
    label: "BTC tx > $1M USD (last 1000)",
    chain: "bitcoin",
    table: "transactions",
    q: "output_total_usd(1000000..)",
    s: "output_total_usd(desc)",
    limit: 50,
    fields: "hash,time,output_total_usd,fee_usd,input_count,output_count",
  },
  {
    label: "Largest BTC blocks (by size)",
    chain: "bitcoin",
    table: "blocks",
    s: "size(desc)",
    limit: 25,
    fields: "id,hash,time,size,transaction_count,guessed_miner",
  },
  {
    label: "ETH txs > 100 ETH",
    chain: "ethereum",
    table: "transactions",
    q: "value(100000000000000000000..)",
    s: "value(desc)",
    limit: 50,
    fields: "hash,time,value,gas_used,fee,sender,recipient",
  },
  {
    label: "BTC SegWit adoption (daily)",
    chain: "bitcoin",
    table: "transactions",
    aggregate: "count(),avg(is_segwit)|date(time)",
    limit: 30,
    s: "date(time)(desc)",
  },
  {
    label: "BTC avg fee per day",
    chain: "bitcoin",
    table: "transactions",
    aggregate: "avg(fee_usd),median(fee_usd),count()|date(time)",
    limit: 30,
    s: "date(time)(desc)",
  },
  {
    label: "Top BTC miners (last 1000 blocks)",
    chain: "bitcoin",
    table: "blocks",
    aggregate: "count()|guessed_miner",
    s: "count()(desc)",
    limit: 25,
  },
];

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics lab — chainscope" },
      {
        name: "description",
        content:
          "Run custom Blockchair infinitable queries: filter, sort, aggregate transactions, blocks, outputs across 40+ chains.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const fn = useServerFn(runInfinitable);
  const [chain, setChain] = useState("bitcoin");
  const [table, setTable] = useState<(typeof TABLES)[number]>("transactions");
  const [q, setQ] = useState("output_total_usd(1000000..)");
  const [s, setS] = useState("output_total_usd(desc)");
  const [fields, setFields] = useState("hash,time,output_total_usd,fee_usd");
  const [aggregate, setAggregate] = useState("");
  const [limit, setLimit] = useState(25);

  const m = useMutation({
    mutationFn: (v: {
      chain: string;
      table: (typeof TABLES)[number];
      q?: string;
      s?: string;
      fields?: string;
      aggregate?: string;
      limit: number;
    }) => fn({ data: v }),
  });

  const run = () =>
    m.mutate({ chain, table, q: q || undefined, s: s || undefined, fields: fields || undefined, aggregate: aggregate || undefined, limit });

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setChain(p.chain);
    setTable(p.table);
    setQ(p.q ?? "");
    setS(p.s ?? "");
    setFields(p.fields ?? "");
    setAggregate(p.aggregate ?? "");
    setLimit(p.limit ?? 25);
    setTimeout(
      () =>
        m.mutate({
          chain: p.chain,
          table: p.table,
          q: p.q,
          s: p.s,
          fields: p.fields,
          aggregate: p.aggregate,
          limit: p.limit ?? 25,
        }),
      0,
    );
  };

  const rows = (m.data?.rows ?? []) as any[];
  const cols = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-mono text-3xl font-bold">Analytics lab</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Custom SQL-like queries against Blockchair's infinitable endpoints. Filter with{" "}
        <code>q=</code>, sort with <code>s=</code>, group with <code>aggregate=</code>.{" "}
        <a
          href="https://github.com/Blockchair/Blockchair.Support/blob/master/API_DOCUMENTATION_EN.md#infinitable"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Docs →
        </a>
      </p>

      {/* Presets */}
      <div className="mt-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="rounded border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-12">
        <Field label="Chain" className="md:col-span-3">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs"
          >
            {CHAINS.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Table" className="md:col-span-3">
          <select
            value={table}
            onChange={(e) => setTable(e.target.value as any)}
            className="w-full rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs"
          >
            {TABLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Limit" className="md:col-span-2">
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="w-full rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs"
          />
        </Field>
        <div className="md:col-span-4 flex items-end">
          <button
            onClick={run}
            disabled={m.isPending}
            className="w-full rounded-md bg-primary px-4 py-2 font-mono text-sm text-primary-foreground disabled:opacity-50"
          >
            {m.isPending ? "Running…" : "Run query"}
          </button>
        </div>

        <Field label="q (filter)" className="md:col-span-6" hint="e.g. value(100..) , time(2024-01-01..)">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="output_total_usd(1000000..)"
            className="w-full rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs"
          />
        </Field>
        <Field label="s (sort)" className="md:col-span-6" hint="e.g. time(desc) , value(asc)">
          <input
            value={s}
            onChange={(e) => setS(e.target.value)}
            placeholder="time(desc)"
            className="w-full rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs"
          />
        </Field>
        <Field label="fields" className="md:col-span-6" hint="comma list; empty = all">
          <input
            value={fields}
            onChange={(e) => setFields(e.target.value)}
            placeholder="hash,time,value"
            className="w-full rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs"
          />
        </Field>
        <Field
          label="aggregate"
          className="md:col-span-6"
          hint="e.g. count()|date(time) — overrides fields"
        >
          <input
            value={aggregate}
            onChange={(e) => setAggregate(e.target.value)}
            placeholder="avg(fee_usd)|date(time)"
            className="w-full rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs"
          />
        </Field>
      </div>

      {m.error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(m.error as Error).message}
        </div>
      )}

      {m.data && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {rows.length} rows
              {m.data.context?.rows_changed ? ` · ${m.data.context.rows_changed} matched` : ""}
              {m.data.context?.cache?.time_left ? ` · cache ${m.data.context.cache.time_left}s` : ""}
            </span>
            <Link to="/" className="hover:text-foreground">← Home</Link>
          </div>
          {cols.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No rows returned.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="min-w-full text-xs">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    {cols.map((c) => (
                      <th key={c} className="px-3 py-2 text-left font-mono font-semibold text-muted-foreground">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/60 hover:bg-muted/20">
                      {cols.map((c) => (
                        <td key={c} className="max-w-[280px] truncate px-3 py-2 font-mono text-foreground">
                          {formatCell(r[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}
