// Provider abstraction for blockchain data APIs.
// Each provider implements a subset of capabilities; the router tries them
// in user-preferred order and falls back on failure.

export type ProviderId = "blockchair" | "blockscout" | "etherscan" | "covalent";

export type Capability = "stats" | "block" | "transaction" | "address" | "portfolio";

export type ProviderFailure = {
  provider: ProviderId;
  status: number;
  url: string;
  path: string;
  params: Record<string, string>;
  upstreamMessage: string;
  message: string;
};

export class ProviderError extends Error {
  failure: ProviderFailure;
  constructor(failure: ProviderFailure) {
    super(failure.message);
    this.name = "ProviderError";
    this.failure = failure;
  }
}

// Multi-chain stats: keyed by chain slug -> partial fields.
export type StatsMap = Record<
  string,
  {
    data?: Record<string, unknown>;
    [k: string]: unknown;
  }
>;

export interface Provider {
  id: ProviderId;
  label: string;
  // Does this provider support `cap` (optionally for `chain`)?
  supports(cap: Capability, chain?: string): boolean;
  // Capability handlers. May be undefined; supports() must agree.
  getAllStats?(opts: { key?: string }): Promise<StatsMap>;
  // Key validation: returns a small status object or throws ProviderError.
  validateKey?(key: string): Promise<{ ok: true; info?: Record<string, unknown> }>;
}
