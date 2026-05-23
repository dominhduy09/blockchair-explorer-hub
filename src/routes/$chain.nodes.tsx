import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getNodes } from "@/lib/blockchair.functions";
import { getChain, isValidChain } from "@/lib/chains";
import { formatNumber } from "@/lib/format";

const nodesQ = (chain: string) =>
  queryOptions({
    queryKey: ["nodes", chain],
    queryFn: () => getNodes({ data: { chain } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/$chain/nodes")({
  head: ({ params }) => {
    const c = getChain(params.chain);
    return {
      meta: [
        { title: `${c?.name ?? params.chain} nodes — chainscope` },
        { name: "description", content: `Network node distribution for ${c?.name ?? params.chain}.` },
      ],
    };
  },
  beforeLoad: ({ params }) => {
    if (!isValidChain(params.chain)) throw notFound();
  },
  loader: ({ params, context }) => context.queryClient.ensureQueryData(nodesQ(params.chain)),
  component: NodesPage,
});

function NodesPage() {
  const { chain } = Route.useParams();
  const meta = getChain(chain)!;
  const { data } = useSuspenseQuery(nodesQ(chain));
  const d: any = data ?? {};

  const versions: Record<string, number> = d.versions ?? {};
  const countries: Record<string, number> = d.countries ?? {};
  const nodes: any[] = Array.isArray(d.nodes) ? d.nodes : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="text-xs text-muted-foreground">
        <Link to="/$chain" params={{ chain }} className="hover:text-primary">
          {meta.name}
        </Link>{" "}
        / nodes
      </div>
      <h1 className="mt-2 font-mono text-3xl font-bold">
        {meta.name} nodes{" "}
        {d.count != null && (
          <span className="text-muted-foreground">· {formatNumber(d.count)}</span>
        )}
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="By version" entries={Object.entries(versions)} />
        <Panel title="By country" entries={Object.entries(countries)} />
      </div>

      {nodes.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Sample nodes ({Math.min(nodes.length, 50)})
          </h2>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-card text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">IP</th>
                  <th className="px-3 py-2 text-left">Version</th>
                  <th className="px-3 py-2 text-left">Country</th>
                  <th className="px-3 py-2 text-left">Height</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background font-mono">
                {nodes.slice(0, 50).map((n, i) => (
                  <tr key={i} className="hover:bg-card/60">
                    <td className="px-3 py-2">{n.ip ?? n.host ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{n.version ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{n.country ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatNumber(n.height)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Panel({ title, entries }: { title: string; entries: [string, number][] }) {
  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 25);
  const max = sorted[0]?.[1] ?? 1;
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-2 font-mono text-sm text-muted-foreground">
        {title}
      </div>
      {sorted.length === 0 ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">No data.</div>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map(([k, v]) => (
            <li key={k} className="px-4 py-2">
              <div className="flex items-baseline justify-between gap-3 font-mono text-xs">
                <span className="truncate text-foreground">{k}</span>
                <span className="text-muted-foreground">{formatNumber(v)}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-background">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.max(2, (v / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
