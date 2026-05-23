import { Link } from "@tanstack/react-router";
import { GlobalSearch } from "./global-search";

const NAV = [
  { to: "/chains", label: "Chains" },
  { to: "/analytics", label: "Analytics" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/news", label: "News" },
  { to: "/tools", label: "Tools" },
  { to: "/broadcast", label: "Broadcast" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6">
        <Link to="/" className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tight">
          <span className="text-primary">◆</span>
          <span>chainscope</span>
        </Link>
        <div className="flex-1 lg:max-w-xl">
          <GlobalSearch />
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
          <a
            href="https://github.com/Blockchair/Blockchair.Support/blob/master/API_DOCUMENTATION_EN.md"
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
