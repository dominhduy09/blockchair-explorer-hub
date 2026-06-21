// Client-side store for blockchain data provider preferences:
//   - Primary provider selection
//   - Per-provider API keys (stored only in localStorage, never on server)
//
// Keys are sent to the server on each request via the client middleware
// in `src/lib/blockchair-key-attacher.ts` as `x-<provider>-key` headers.
// The server validates header shape before using them.

import type { ProviderId } from "./providers/types";

const PRIMARY_STORAGE = "provider_primary";
const KEY_STORAGE_PREFIX = "provider_key_";

// Per-provider key shape patterns. Conservative; reject obvious garbage.
export const KEY_PATTERNS: Record<ProviderId, RegExp> = {
  blockchair: /^[A-Za-z0-9_-]{16,128}$/,
  blockscout: /^.{0,0}$/, // no key
  etherscan: /^[A-Z0-9]{30,40}$/,
  covalent: /^cqt_[A-Za-z0-9_-]{20,80}$/,
};

// Back-compat with the earlier single-key store + dialog.
export const BLOCKCHAIR_KEY_PATTERN = KEY_PATTERNS.blockchair;

export function isValidKeyShape(provider: ProviderId, key: string): boolean {
  return KEY_PATTERNS[provider].test(key.trim());
}

export function isValidBlockchairKeyShape(key: string): boolean {
  return isValidKeyShape("blockchair", key);
}

function keyStorageName(provider: ProviderId): string {
  return `${KEY_STORAGE_PREFIX}${provider}`;
}

export function getStoredKey(provider: ProviderId): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyStorageName(provider));
    if (!raw) return null;
    const t = raw.trim();
    return isValidKeyShape(provider, t) ? t : null;
  } catch {
    return null;
  }
}

export function setStoredKey(provider: ProviderId, key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyStorageName(provider), key.trim());
}

export function clearStoredKey(provider: ProviderId): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(keyStorageName(provider));
}

const DEFAULT_PRIMARY: ProviderId = "blockchair";

export function getStoredPrimary(): ProviderId {
  if (typeof window === "undefined") return DEFAULT_PRIMARY;
  try {
    const raw = window.localStorage.getItem(PRIMARY_STORAGE) as ProviderId | null;
    if (raw && (raw === "blockchair" || raw === "blockscout" || raw === "etherscan" || raw === "covalent")) {
      return raw;
    }
  } catch {
    // ignore
  }
  return DEFAULT_PRIMARY;
}

export function setStoredPrimary(p: ProviderId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRIMARY_STORAGE, p);
}

// ---- back-compat single-key helpers (the existing dialog imported these) ----
export const BLOCKCHAIR_KEY_STORAGE = `${KEY_STORAGE_PREFIX}blockchair`;
export const getStoredBlockchairKey = () => getStoredKey("blockchair");
export const setStoredBlockchairKey = (k: string) => setStoredKey("blockchair", k);
export const clearStoredBlockchairKey = () => clearStoredKey("blockchair");
