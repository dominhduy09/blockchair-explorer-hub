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
  clearStoredKey,
  getStoredKey,
  getStoredPrimary,
  isValidKeyShape,
  setStoredKey,
  setStoredPrimary,
} from "@/lib/api-key-store";
import { validateProviderKey } from "@/lib/blockchair.functions";
import { PROVIDER_META, PROVIDER_ORDER } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/providers/types";

type FieldState = {
  value: string;
  stored: boolean;
  status:
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "ok"; info: Record<string, any> | null }
    | { kind: "error"; message: string };
};

const EMPTY_FIELD: FieldState = { value: "", stored: false, status: { kind: "idle" } };

export function ApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [primary, setPrimary] = useState<ProviderId>("blockchair");
  const [fields, setFields] = useState<Record<ProviderId, FieldState>>({
    blockchair: { ...EMPTY_FIELD },
    blockscout: { ...EMPTY_FIELD },
    etherscan: { ...EMPTY_FIELD },
    covalent: { ...EMPTY_FIELD },
  });
  const validate = useServerFn(validateProviderKey);

  useEffect(() => {
    if (!open) return;
    setPrimary(getStoredPrimary());
    const next: Record<ProviderId, FieldState> = { ...fields };
    for (const id of PROVIDER_ORDER) {
      const existing = getStoredKey(id);
      next[id] = {
        value: existing ?? "",
        stored: Boolean(existing),
        status: { kind: "idle" },
      };
    }
    setFields(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function update(id: ProviderId, patch: Partial<FieldState>) {
    setFields((f) => ({ ...f, [id]: { ...f[id], ...patch } }));
  }

  function onPickPrimary(p: ProviderId) {
    setPrimary(p);
    setStoredPrimary(p);
  }

  async function onValidateAndSave(id: ProviderId) {
    const f = fields[id];
    const trimmed = f.value.trim();
    const meta = PROVIDER_META[id];
    if (!meta.requiresKey && !trimmed) {
      // No-op for providers that don't need a key.
      return;
    }
    if (!isValidKeyShape(id, trimmed)) {
      update(id, { status: { kind: "error", message: "Key format does not match this provider." } });
      return;
    }
    update(id, { status: { kind: "checking" } });
    try {
      const res = await validate({ data: { provider: id, key: trimmed } });
      if (!res.valid) {
        update(id, { status: { kind: "error", message: res.error ?? "Validation failed." } });
        return;
      }
      setStoredKey(id, trimmed);
      update(id, { stored: true, status: { kind: "ok", info: res.info } });
    } catch (e) {
      update(id, { status: { kind: "error", message: (e as Error).message } });
    }
  }

  function onClear(id: ProviderId) {
    clearStoredKey(id);
    update(id, { value: "", stored: false, status: { kind: "idle" } });
  }

  const anyStored = Object.values(fields).some((f) => f.stored) || primary !== "blockchair";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Data providers"
        >
          <KeyRound className="h-3.5 w-3.5" />
          <span>Providers</span>
          {anyStored && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Blockchain data providers</DialogTitle>
          <DialogDescription>
            Pick a primary data source and add API keys. The app falls back to the next
            available provider on failure. Keys are stored only in this browser and sent
            on each request — never persisted on our servers. Note: providers other than
            Blockchair currently only contribute to the homepage stats table; per-chain
            block/transaction/address pages still use Blockchair.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <label className="font-mono text-xs text-muted-foreground">Primary provider</label>
          <div className="flex flex-wrap gap-2">
            {PROVIDER_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onPickPrimary(id)}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  primary === id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {PROVIDER_META[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {PROVIDER_ORDER.map((id) => {
            const f = fields[id];
            const meta = PROVIDER_META[id];
            const shapeOk = f.value.trim().length === 0 || isValidKeyShape(id, f.value);
            return (
              <div key={id} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{meta.label}</span>
                    {f.stored && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                        saved
                      </span>
                    )}
                    {!meta.requiresKey && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        key optional
                      </span>
                    )}
                  </div>
                  <a
                    href={meta.getKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-muted-foreground underline hover:text-foreground"
                  >
                    get key
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground">{meta.keyHint}</p>
                <Input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={f.value}
                  onChange={(e) => update(id, { value: e.target.value, status: { kind: "idle" } })}
                  placeholder={`Paste your ${meta.label} key`}
                  aria-invalid={!shapeOk}
                />
                {!shapeOk && (
                  <p className="text-xs text-destructive">Key shape doesn't match this provider.</p>
                )}
                {f.status.kind === "ok" && (
                  <p className="text-xs text-foreground">
                    ✓ Key works.
                    {f.status.info?.plan ? ` Plan: ${String(f.status.info.plan)}.` : ""}
                    {f.status.info?.remainingRequests != null
                      ? ` Requests left: ${String(f.status.info.remainingRequests)}.`
                      : ""}
                  </p>
                )}
                {f.status.kind === "error" && (
                  <p className="text-xs text-destructive break-words">{f.status.message}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onClear(id)}
                    disabled={!f.stored && f.value.length === 0}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onValidateAndSave(id)}
                    disabled={
                      f.status.kind === "checking" ||
                      !shapeOk ||
                      f.value.trim().length === 0 ||
                      !meta.requiresKey && f.value.trim().length === 0
                    }
                  >
                    {f.status.kind === "checking" ? "Validating…" : "Validate & save"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
