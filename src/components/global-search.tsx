import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export function GlobalSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        navigate({ to: "/search", search: { q: v } });
      }}
      className="flex w-full items-center gap-2 rounded-md border border-border bg-input px-3 py-2 font-mono text-sm focus-within:ring-2 focus-within:ring-ring"
    >
      <span className="text-muted-foreground">›</span>
      <input
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="search tx hash, address, block, or height…"
        className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}
