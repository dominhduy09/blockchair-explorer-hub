import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getNews } from "@/lib/blockchair.functions";
import { relativeTime } from "@/lib/format";
import { z } from "zod";

const LANGS = ["en", "es", "fr", "de", "it", "pt", "ru", "tr", "zh", "ko", "jp", "ar"] as const;
const searchSchema = z.object({ lang: z.enum(LANGS).catch("en") });

const newsQuery = (lang: string) =>
  queryOptions({
    queryKey: ["news", lang] as const,
    queryFn: () => getNews({ data: { language: lang, limit: 50 } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/news")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ lang: search.lang }),
  loader: ({ deps, context }) => context.queryClient.ensureQueryData(newsQuery(deps.lang)),
  head: () => ({
    meta: [
      { title: "Crypto news — chainscope" },
      { name: "description", content: "Latest crypto news aggregated from across the web." },
      { property: "og:title", content: "Crypto news — chainscope" },
      { property: "og:description", content: "Latest crypto news aggregated from across the web." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { lang } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(newsQuery(lang));
  const items = (data ?? []) as any[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-mono text-3xl font-bold">Crypto news</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aggregated via Blockchair <code>/news</code>.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <button
            key={l}
            onClick={() => navigate({ search: { lang: l } })}
            className={`rounded border px-2 py-1 font-mono text-xs ${
              l === lang
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {items.map((n) => (
          <li key={n.hash} className="rounded-lg border border-border bg-card p-4">
            <a
              href={n.link}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-base text-foreground hover:text-primary"
            >
              {n.title}
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{n.source}</span>
              <span>·</span>
              <span>{relativeTime(n.time)}</span>
            </div>
            {n.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{n.description}</p>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No articles available.
          </li>
        )}
      </ul>
    </div>
  );
}
