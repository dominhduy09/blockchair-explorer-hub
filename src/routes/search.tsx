import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { smartSearch } from "@/lib/blockchair.functions";
import { getChain } from "@/lib/chains";

const searchSchema = z.object({ q: z.string().catch("") });

const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ["smart-search", q],
    queryFn: () => smartSearch({ data: { q } }),
    staleTime: 60_000,
    enabled: q.length > 0,
  });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps, context }) => {
    if (!deps.q) return null;
    return context.queryClient.ensureQueryData(searchQuery(deps.q));
  },
  head: ({ match }) => ({
    meta: [
      { title: match.search?.q ? `Search: ${match.search.q} — chainscope` : "Search — chainscope" },
      { name: "description", content: "Search blocks, transactions, and addresses across chains." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  if (!q) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Enter a query in the search bar above.</p>
      </div>
    );
  }
  return <Results q={q} />;
}

function Results({ q }: { q: string }) {
  const { data } = useSuspenseQuery(searchQuery(q));
  const results = data?.results ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-mono text-2xl font-bold">
        Search results
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        for <code className="text-foreground">{q}</code>
      </p>

      {data?.error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {data.error}
        </div>
      )}

      {results.length === 0 ? (
        <div className="mt-8 rounded-md border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No matches found across any supported chain.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {results.map((r, i) => {
            const chain = getChain(r.chain);
            if (!chain) return null;
            const linkProps = linkFor(r.chain, r.type, r.query);
            if (!linkProps) return null;
            return (
              <li key={i}>
                <Link
                  {...linkProps as any}
                  className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 hover:border-primary/60"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chain.color }}
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs text-muted-foreground">
                      {chain.name} · {prettyType(r.type)}
                    </div>
                    <div className="truncate font-mono text-sm text-foreground">{r.query}</div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function prettyType(t: string) {
  return t.replace(/_/g, " ");
}

function linkFor(chain: string, type: string, query: string) {
  if (type.includes("block")) return { to: "/$chain/block/$id", params: { chain, id: query } };
  if (type.includes("transaction")) return { to: "/$chain/transaction/$hash", params: { chain, hash: query } };
  if (type.includes("address")) return { to: "/$chain/address/$addr", params: { chain, addr: query } };
  // Fallback: send to chain dashboard
  return { to: "/$chain", params: { chain } };
}
