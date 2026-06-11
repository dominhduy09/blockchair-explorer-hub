// Client-side store for the user's optional Blockchair API key.
// Stored in localStorage only; never persisted server-side.
// The key is attached to every server-fn RPC via a client middleware
// (see `src/lib/blockchair-key-attacher.ts`) and used by `bcFetch`
// in place of the project-default key.

export const BLOCKCHAIR_KEY_STORAGE = "blockchair_api_key";

// Blockchair keys are opaque strings — accept a conservative shape so we
// reject obvious garbage before sending it upstream.
export const BLOCKCHAIR_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function isValidBlockchairKeyShape(key: string): boolean {
  return BLOCKCHAIR_KEY_PATTERN.test(key.trim());
}

export function getStoredBlockchairKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BLOCKCHAIR_KEY_STORAGE);
    if (!raw) return null;
    const trimmed = raw.trim();
    return isValidBlockchairKeyShape(trimmed) ? trimmed : null;
  } catch {
    return null;
  }
}

export function setStoredBlockchairKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOCKCHAIR_KEY_STORAGE, key.trim());
}

export function clearStoredBlockchairKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BLOCKCHAIR_KEY_STORAGE);
}
