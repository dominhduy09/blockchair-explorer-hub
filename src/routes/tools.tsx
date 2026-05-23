import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getHalvening, getRange } from "@/lib/blockchair.functions";
import { formatNumber } from "@/lib/format";
import { getChain } from "@/lib/chains";

const halveningQ = queryOptions({
  queryKey: ["tools", "halvening"],
  queryFn: () => getHalvening(),
  staleTime: 60_000,
});
const rangeQ = queryOptions({
  queryKey: ["tools", "range"],
  queryFn: () => getRange(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tools — chainscope" },
      { name: "description", content: "Bitcoin halvening countdown and available chain ranges." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(halveningQ),
      context.queryClient.ensureQueryData(rangeQ),
    ]);
  },
  component: ToolsPage,
});

function ToolsPage() {
  const { data: halv } = useSuspenseQuery(halveningQ);
  const { data: range } = useSuspenseQuery(rangeQ);
  const h: any = halv ?? {};
  const r: Record<string, any> = (range as any) ?? {};

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <section>
        <h1 className="font-mono text-3xl font-bold">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Blockchair utility endpoints: halvening countdown and per-chain data ranges.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Bitcoin halvening
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Current block" value={formatNumber(h.current_block)} />
          <Stat label="Halvening block" value={formatNumber(h.halvening_block)} />
          <Stat label="Blocks left" value={formatNumber(h.blocks_until_halvening)} />
          <Stat label="Current reward" value={h.current_reward != null ? `${h.current_reward} BTC` : "—"} />
          <Stat label="Reward after" value={h.reward_after_halvening != null ? `${h.reward_after_halvening} BTC` : "—"} />
          <Stat label="ETA" value={h.estimated_halvening_date ?? "—"} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Available ranges
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Chain</th>
                <th className="px-4 py-2 text-left">From</th>
                <th className="px-4 py-2 text-left">To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {Object.entries(r).map(([slug, val]: [string, any]) => {
                const meta = getChain(slug);
                return (
                  <tr key={slug} className="hover:bg-card/60">
                    <td className="px-4 py-2 font-mono">
                      {meta ? (
                        <Link to="/$chain" params={{ chain: slug }} className="text-primary hover:underline">
                          {meta.name}
                        </Link>
                      ) : (
                        slug
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {val?.from ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {val?.to ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}
