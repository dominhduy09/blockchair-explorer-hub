import { useState } from "react";

export function CopyHash({
  value,
  truncate = false,
  className = "",
}: {
  value: string;
  truncate?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const display = truncate && value.length > 18
    ? `${value.slice(0, 8)}…${value.slice(-6)}`
    : value;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // ignore
        }
      }}
      title={value}
      className={`group inline-flex items-center gap-1.5 font-mono text-sm text-foreground hover:text-primary transition-colors ${className}`}
    >
      <span className="break-all">{display}</span>
      <span className="text-xs text-muted-foreground group-hover:text-primary">
        {copied ? "✓" : "⧉"}
      </span>
    </button>
  );
}
