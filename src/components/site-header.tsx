import { Link } from "@tanstack/react-router";
import { GlobalSearch } from "./global-search";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
        <Link to="/" className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tight">
          <span className="text-primary">◆</span>
          <span>chainscope</span>
        </Link>
        <div className="flex-1 sm:max-w-xl">
          <GlobalSearch />
        </div>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link
            to="/chains"
            className="transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Chains
          </Link>
          <a
            href="https://blockchair.com/api/docs"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            API docs
          </a>
        </nav>
      </div>
    </header>
  );
}
