import { createMiddleware } from "@tanstack/react-start";
import { getStoredKey, getStoredPrimary } from "./api-key-store";
import type { ProviderId } from "./providers/types";

const PROVIDERS: ProviderId[] = ["blockchair", "blockscout", "etherscan", "covalent"];

// Attaches per-provider API keys and the user's primary provider choice
// to every server-fn RPC. Keys are validated server-side before use.
export const attachBlockchairKey = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const headers: Record<string, string> = {};
    for (const p of PROVIDERS) {
      const k = getStoredKey(p);
      if (k) headers[`x-${p}-key`] = k;
    }
    const primary = getStoredPrimary();
    if (primary) headers["x-provider-primary"] = primary;
    return next({ headers });
  },
);
