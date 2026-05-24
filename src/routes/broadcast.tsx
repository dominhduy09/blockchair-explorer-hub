import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { broadcastTx } from "@/lib/blockchair.functions";
import { useState } from "react";

const CHAINS = ["bitcoin", "bitcoin-cash", "ethereum", "litecoin", "dogecoin", "dash", "groestlcoin", "zcash"] as const;

export const Route = createFileRoute("/broadcast")({
  head: () => ({
    meta: [
      { title: "Broadcast transaction — chainscope" },
      { name: "description", content: "Broadcast a signed raw transaction to the network." },
    ],
  }),
  component: BroadcastPage,
});

function BroadcastPage() {
  const fn = useServerFn(broadcastTx);
  const [chain, setChain] = useState<(typeof CHAINS)[number]>("bitcoin");
  const [raw, setRaw] = useState("");
  const m = useMutation({ mutationFn: (v: { chain: string; data: string }) => fn({ data: v }) });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-mono text-3xl font-bold">Broadcast transaction</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Submit a signed raw transaction (hex) to the network via Blockchair's <code>push/transaction</code>.
      </p>

      <section className="mt-6 rounded-lg border border-border bg-card/50 p-6">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          How to use
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground">
          <li>
            <span className="font-medium">Sign your transaction offline</span> using your wallet
            or a library (bitcoinjs-lib, ethers, etc.). This page does NOT sign — it only relays.
          </li>
          <li>
            <span className="font-medium">Pick the chain</span> that matches your signed transaction.
            Sending a BTC tx on the LTC network (or vice versa) will fail.
          </li>
          <li>
            <span className="font-medium">Paste the raw transaction hex</span> into the textarea
            (e.g. <code>0100000001…</code> for Bitcoin-family, or <code>0xf86c…</code> for Ethereum).
          </li>
          <li>
            Click <span className="font-medium">Broadcast</span>. On success the response shows the
            accepted txid; on failure you'll see the node's rejection reason (already-spent inputs,
            low fee, malformed hex, etc.).
          </li>
          <li>
            <span className="font-medium">Tip:</span> always double-check the hex — broadcasted
            transactions cannot be undone.
          </li>
        </ol>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (raw.trim()) m.mutate({ chain, data: raw.trim() });
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Chain</label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as any)}
            className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm"
          >
            {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Raw tx hex</label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            placeholder="0100000001..."
            className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs"
          />
        </div>
        <button
          type="submit"
          disabled={m.isPending || !raw.trim()}
          className="rounded-md bg-primary px-4 py-2 font-mono text-sm text-primary-foreground disabled:opacity-50"
        >
          {m.isPending ? "Broadcasting…" : "Broadcast"}
        </button>
      </form>

      {m.error && (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(m.error as Error).message}
        </div>
      )}
      {m.data && (
        <div className="mt-6 rounded-md border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Response</div>
          <pre className="mt-2 overflow-x-auto text-xs text-foreground">{JSON.stringify(m.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
