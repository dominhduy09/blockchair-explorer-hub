
# Blockchair Multi-Chain Explorer

A clean, fast block explorer for browsing blocks, transactions, and addresses across all 40+ blockchains supported by Blockchair.

## What you'll get

- **Home page** with a global search bar (tx hash / address / block / height) and live stats for the top chains
- **Chain selector** listing all supported chains (Bitcoin, Ethereum, Solana, TRON, XRP, Litecoin, Dogecoin, BCH, etc.) grouped by category
- **Chain dashboard** per chain showing live stats (price, market cap, blocks, hashrate, mempool, fees) and latest blocks/transactions
- **Block detail** page — height, hash, time, miner, fees, tx count, list of transactions
- **Transaction detail** page — inputs/outputs (or from/to for EVM), value, fee, confirmations
- **Address detail** page — balance, tx count, received/spent totals, paginated transaction history

## How it works

1. **API key stored as a secret** in Lovable Cloud (not exposed to browser)
2. **Server functions** (`createServerFn`) proxy all calls to `api.blockchair.com`, appending `?key=...` server-side
3. Frontend calls only our own server functions — no key ever reaches the client
4. TanStack Query caches responses with sensible stale times (stats 30s, blocks/tx 60s)

## Routes

```
/                          Landing + global search + featured chain stats
/chains                    Grid of all supported chains
/$chain                    Chain dashboard (stats, latest blocks, latest txs)
/$chain/block/$id          Block detail
/$chain/transaction/$hash  Transaction detail
/$chain/address/$addr      Address detail
/search?q=...              Smart redirect based on input type
```

Each route gets its own `head()` metadata for SEO/sharing.

## Design

- Dark, terminal-inspired aesthetic suited to blockchain data
- Monospace for hashes/addresses with click-to-copy
- Chain logos/colors as visual anchors
- Responsive tables that collapse to cards on mobile

## Technical notes

- Lovable Cloud enabled to store `BLOCKCHAIR_API_KEY` as a server secret
- One thin server function per Blockchair endpoint family (`stats`, `dashboard`, `raw`, `search`)
- Server-side input validation with Zod (chain slug allowlist, hash/address shape checks)
- Graceful error handling for rate-limit (402/429) and not-found responses

## Scope for v1

Focus on the dashboard endpoints (blocks, transactions, addresses, stats) across all chains. Advanced infinitable SQL-like queries, broadcast-transaction, and ENS lookup can be follow-ups.
