import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMultiAddresses } from "@/lib/blockchair.functions";
import { formatUsd } from "@/lib/format";
import { useState } from "react";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Multi-chain portfolio — chainscope" },
      { name: "description", content: "Track balances across Bitcoin, Ethereum, Litecoin and more in one view." },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const fn = useServerFn(getMultiAddresses);
  const [raw, setRaw] = useState("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa\nethereum:0x19DdD94B94D3c68385c897846AB44Ac99DBFAe0f");
  const m = useMutation({ mutationFn: (addresses: string[]) => fn({ data: { addresses } }) });

  const data: any = m.data ?? null;
  const set = data?.set;
  const addresses: Record<string, any> = data?.addresses ?? {};

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-mono text-3xl font-bold">Portfolio tracker</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Up to 100 addresses across Bitcoin, Ethereum, Litecoin, Bitcoin Cash, Dash, Groestlcoin, Zcash. One line per address as <code>chain:address</code>.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const list = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
          if (list.length) m.mutate(list);
        }}
        className="mt-6 space-y-4"
      >
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          className="block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs"
        />
        <button
          type="submit"
          disabled={m.isPending}
          className="rounded-md bg-primary px-4 py-2 font-mono text-sm text-primary-foreground disabled:opacity-50"
        >
          {m.isPending ? "Loading…" : "Check portfolio"}
        </button>
      </form>

      {m.error && (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(m.error as Error).message}
        </div>
      )}

      {set && (
        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total balance (USD)</div>
          <div className="mt-1 font-mono text-3xl text-foreground">{formatUsd(set.balance_usd)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {set.address_count} addresses · {set.transaction_count} transactions
          </div>
        </div>
      )}

      {Object.keys(addresses).length > 0 && (
        <ul className="mt-4 space-y-2">
          {Object.entries(addresses).map(([key, a]) => (
            <li key={key} className="rounded-md border border-border bg-card p-4">
              <div className="truncate font-mono text-xs text-muted-foreground">{key}</div>
              <div className="mt-1 flex items-baseline justify-between">
                <div className="font-mono text-base text-foreground">{formatUsd(a.balance_usd)}</div>
                <div className="text-xs text-muted-foreground">{a.transaction_count ?? a.call_count ?? a.output_count ?? "—"} tx</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
