import { createFileRoute, Link } from "@tanstack/react-router";
import { CHAINS, type ChainCategory } from "@/lib/chains";

export const Route = createFileRoute("/chains")({
  head: () => ({
    meta: [
      { title: "All chains — chainscope" },
      { name: "description", content: "Browse all blockchains supported by chainscope." },
      { property: "og:title", content: "All chains — chainscope" },
      { property: "og:description", content: "40+ supported blockchains." },
    ],
  }),
  component: ChainsPage,
});

const CATEGORY_LABELS: Record<ChainCategory, string> = {
  utxo: "UTXO chains",
  evm: "EVM chains",
  other: "Other L1s",
};

function ChainsPage() {
  const grouped = CHAINS.reduce<Record<ChainCategory, typeof CHAINS>>(
    (acc, c) => {
      (acc[c.category] ||= []).push(c);
      return acc;
    },
    { utxo: [], evm: [], other: [] },
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-mono text-3xl font-bold">All chains</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {CHAINS.length} blockchains powered by the Blockchair API.
      </p>

      {(["utxo", "evm", "other"] as ChainCategory[]).map((cat) => (
        <section key={cat} className="mt-10">
          <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {grouped[cat].map((chain) => (
              <Link
                key={chain.slug}
                to="/$chain"
                params={{ chain: chain.slug }}
                className="group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/60"
              >
                <span
                  className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: chain.color }}
                />
                <span className="flex-1 truncate font-mono text-sm text-foreground">{chain.name}</span>
                <span className="text-xs text-muted-foreground">{chain.ticker}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
