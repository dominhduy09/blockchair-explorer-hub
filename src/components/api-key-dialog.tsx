import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearStoredBlockchairKey,
  getStoredBlockchairKey,
  isValidBlockchairKeyShape,
  setStoredBlockchairKey,
} from "@/lib/api-key-store";
import { validateBlockchairKey } from "@/lib/blockchair.functions";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; plan: string | null; remaining: number | null }
  | { kind: "error"; message: string };

export function ApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [hasStored, setHasStored] = useState(false);
  const validate = useServerFn(validateBlockchairKey);

  useEffect(() => {
    if (!open) return;
    const existing = getStoredBlockchairKey();
    setValue(existing ?? "");
    setHasStored(Boolean(existing));
    setStatus({ kind: "idle" });
  }, [open]);

  const shapeOk = value.trim().length === 0 || isValidBlockchairKeyShape(value);

  async function onValidateAndSave() {
    const trimmed = value.trim();
    if (!isValidBlockchairKeyShape(trimmed)) {
      setStatus({ kind: "error", message: "Key must be 16–128 chars (A–Z, 0–9, _ or -)." });
      return;
    }
    setStatus({ kind: "checking" });
    try {
      const res = await validate({ data: { key: trimmed } });
      if (!res.valid) {
        setStatus({ kind: "error", message: res.error ?? "Blockchair rejected the key." });
        return;
      }
      setStoredBlockchairKey(trimmed);
      setHasStored(true);
      setStatus({
        kind: "ok",
        plan: res.plan,
        remaining: typeof res.remainingRequests === "number" ? res.remainingRequests : null,
      });
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  }

  function onClear() {
    clearStoredBlockchairKey();
    setValue("");
    setHasStored(false);
    setStatus({ kind: "idle" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Blockchair API key"
        >
          <KeyRound className="h-3.5 w-3.5" />
          <span>API key</span>
          {hasStored && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Blockchair API key</DialogTitle>
          <DialogDescription>
            Use your own key to raise rate limits and unlock premium fields. The key is
            stored only in this browser (localStorage) and sent on each request to
            Blockchair — never saved on our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste your Blockchair API key"
            aria-invalid={!shapeOk}
          />
          {!shapeOk && (
            <p className="text-xs text-destructive">
              Key must be 16–128 chars (A–Z, 0–9, _ or -).
            </p>
          )}
          {status.kind === "ok" && (
            <p className="text-xs text-foreground">
              ✓ Key works.
              {status.plan ? ` Plan: ${status.plan}.` : ""}
              {status.remaining !== null ? ` Requests left: ${status.remaining}.` : ""}
            </p>
          )}
          {status.kind === "error" && (
            <p className="text-xs text-destructive break-words">{status.message}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Get a key at{" "}
            <a
              href="https://blockchair.com/api/plans"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              blockchair.com/api/plans
            </a>
            . Anyone with access to this device can read the stored key — use a
            device-scoped key if possible.
          </p>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClear}
            disabled={!hasStored && value.length === 0}
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={onValidateAndSave}
            disabled={status.kind === "checking" || !shapeOk || value.trim().length === 0}
          >
            {status.kind === "checking" ? "Validating…" : "Validate & save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
