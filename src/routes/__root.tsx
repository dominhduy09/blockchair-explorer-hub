import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";

function NotFoundComponent() {
  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-mono text-6xl font-bold text-primary">404</h1>
        <p className="mt-4 text-lg text-foreground">Nothing here on-chain.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The URL you requested doesn't match any block, transaction, address, or page.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to explorer
        </Link>
      </div>
    </Shell>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-mono text-3xl font-semibold text-destructive">Request failed</h1>
        <p className="mt-3 text-sm text-muted-foreground break-words">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Retry
          </button>
          <Link
            to="/"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Home
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>{children}</main>
      <footer className="mt-16 border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-2">
          <div>
            <h3 className="font-mono text-sm font-semibold text-foreground">About</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              <span className="text-foreground">Minh Duy Do</span> is a Computer Science student passionate about
              building modern, high-performance web applications. With a strong interest in AI, system design, and
              scalable software engineering, he focuses on creating impactful and efficient solutions.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              He has experience in full-stack development, machine learning, and cloud technologies, and actively
              builds projects, contributes to open-source, and explores new technologies to continuously grow as a
              developer.
            </p>
          </div>
          <div>
            <h3 className="font-mono text-sm font-semibold text-foreground">Credits & contact</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>
                GitHub:{" "}
                <a href="https://github.com/dominhduy09" target="_blank" rel="noreferrer" className="text-foreground hover:text-primary">
                  github.com/dominhduy09
                </a>
              </li>
              <li>
                LinkedIn:{" "}
                <a href="https://linkedin.com/in/duy-do-minh-0b37501a9" target="_blank" rel="noreferrer" className="text-foreground hover:text-primary">
                  linkedin.com/in/duy-do-minh-0b37501a9
                </a>
              </li>
              <li>
                Email:{" "}
                <a href="mailto:dominhduy09@gmail.com" className="text-foreground hover:text-primary">
                  dominhduy09@gmail.com
                </a>
              </li>
            </ul>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Data via{" "}
              <a href="https://blockchair.com" target="_blank" rel="noreferrer" className="text-foreground hover:text-primary">
                Blockchair API
              </a>
              . Built on Lovable.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "chainscope — multi-chain block explorer" },
      { name: "description", content: "Explore blocks, transactions, and addresses across 40+ blockchains." },
      { property: "og:title", content: "chainscope — multi-chain block explorer" },
      { name: "twitter:title", content: "chainscope — multi-chain block explorer" },
      { property: "og:description", content: "Explore blocks, transactions, and addresses across 40+ blockchains." },
      { name: "twitter:description", content: "Explore blocks, transactions, and addresses across 40+ blockchains." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f94a8c62-e2b6-4380-92b2-b15f615f429d" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f94a8c62-e2b6-4380-92b2-b15f615f429d" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Shell>
        <Outlet />
      </Shell>
    </QueryClientProvider>
  );
}
