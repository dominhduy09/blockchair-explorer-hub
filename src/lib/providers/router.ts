import { PROVIDERS, PROVIDER_ORDER } from "./registry";
import type { Capability, ProviderFailure, ProviderId, StatsMap } from "./types";
import { ProviderError } from "./types";

export type Keys = Partial<Record<ProviderId, string>>;

function orderedFor(cap: Capability, primary: ProviderId | undefined, chain?: string): ProviderId[] {
  const candidates = PROVIDER_ORDER.filter((id) => PROVIDERS[id].supports(cap, chain));
  if (!primary || !candidates.includes(primary)) return candidates;
  return [primary, ...candidates.filter((id) => id !== primary)];
}

export type StatsResult =
  | { data: StatsMap; provider: ProviderId; failures: ProviderFailure[] }
  | { data: StatsMap; provider: null; failures: ProviderFailure[] };

export async function routeAllStats(
  primary: ProviderId | undefined,
  keys: Keys,
): Promise<StatsResult> {
  const ids = orderedFor("stats", primary);
  const failures: ProviderFailure[] = [];

  for (const id of ids) {
    const provider = PROVIDERS[id];
    if (!provider.getAllStats) continue;
    try {
      const data = await provider.getAllStats({ key: keys[id] });
      return { data, provider: id, failures };
    } catch (e) {
      if (e instanceof ProviderError) {
        failures.push(e.failure);
        console.error(`[providers] ${id} getAllStats failed:`, e.failure);
        continue;
      }
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({
        provider: id,
        status: 0,
        url: "",
        path: "/stats",
        params: {},
        upstreamMessage: msg,
        message: msg,
      });
      console.error(`[providers] ${id} unexpected:`, e);
    }
  }
  return { data: {}, provider: null, failures };
}
