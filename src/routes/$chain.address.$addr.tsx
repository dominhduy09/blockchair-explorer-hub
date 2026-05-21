import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAddress } from "@/lib/blockchair.functions";
import { getChain, isValidChain } from "@/lib/chains";
import { CopyHash } from "@/components/copy-hash";
import { formatNumber, relativeTime } from "@/lib/format";

const addrQuery = (chain: string, address: string) =>
  queryOptions({
    queryKey: ["address", chain, address],
    queryFn: () => getAddress({ data: { chain, address } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/$chain/address/$addr")({
  head: ({ params }) => {
    const c = getChain(params.chain);
    return {
      meta: [
        { title: `${params.addr.slice(0, 10)}… on ${c?.name ?? params.chain} — chainscope` },
        { name: "description", content: `Address details on ${c?.name ?? params.chain}.` },
      ],
    };
  },
  beforeLoad: ({ params }) => {
    if (!isValidChain(params.chain)) throw notFound();
  },
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(addrQuery(params.chain, params.addr)),
  component: AddressPage,
});

function AddressPage() {
  const { chain, addr } = Route.useParams();
  const meta = getChain(chain)!;
  const { data } = useSuspenseQuery(addrQuery(chain, addr));

  const entry = data?.data ? Object.values<any>(data.data)[0] : null;
  const address = entry?.address ?? null;
  const txs: any[] = entry?.transactions ?? [];

  if (!address) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="font-mono text-2xl">Address not found</h1>
        <p className="mt-2 break-all text-sm text-muted-foreground">
          No data for <code>{addr}</code> on {meta.name}.
        </p>
        <Link to="/$chain" params={{ chain }} className="mt-6 inline-block text-primary hover:underline">
          ← Back to {meta.name}
        </Link>
      </div>
    );
  }

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Balance", value: address.balance ?? address.balance_approximate ?? "—" },
    { label: "Balance (USD)", value: address.balance_usd ? `$${formatNumber(address.balance_usd, 2)}` : undefined },
    { label: "Received", value: address.received ?? undefined },
    { label: "Spent", value: address.spent ?? undefined },
    { label: "Transactions", value: formatNumber(address.transaction_count) },
    { label: "First seen", value: address.first_seen_receiving ? `${address.first_seen_receiving} · ${relativeTime(address.first_seen_receiving)}` : undefined },
    { label: "Last activity", value: address.last_seen_spending ?? address.last_seen_receiving ?? undefined },
    { label: "Type", value: address.type ?? undefined },
  ].filter((f) => f.value !== undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="text-xs text-muted-foreground">
        <Link to="/$chain" params={{ chain }} className="hover:text-primary">
          {meta.name}
        </Link>
        {" / "} address
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="font-mono text-2xl font-bold">Address</h1>
        <CopyHash value={addr} truncate className="text-base" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.label} className="rounded-md border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</div>
            <div className="mt-1 text-foreground">{f.value}</div>
          </div>
        ))}
      </div>

      {txs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Recent transactions ({txs.length})
          </h2>
          <div className="overflow-hidden rounded-md border border-border">
            <ul className="divide-y divide-border">
              {txs.map((t, i) => {
                const hash = typeof t === "string" ? t : t.hash;
                return (
                  <li key={i} className="bg-card px-4 py-2 hover:bg-card/70">
                    <Link
                      to="/$chain/transaction/$hash"
                      params={{ chain, hash }}
                      className="font-mono text-xs text-foreground hover:text-primary"
                    >
                      {hash}
                    </Link>
                    {typeof t === "object" && (t.time || t.balance_change) && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t.time ?? ""} {t.balance_change ? ` · Δ ${t.balance_change}` : ""}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
