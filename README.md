# ChainScope — Blockchair Multi-Chain Explorer

A fast, clean block explorer for browsing blocks, transactions, addresses, and on-chain analytics across 17+ blockchains supported by the [Blockchair API](https://blockchair.com/api/docs). Built with TanStack Start, React 19, Tailwind CSS v4, and Lovable Cloud.

> Live: <https://blockchair-explorer-hub.lovable.app>

---

## Features

- **Global dashboard** — aggregated stats across all supported chains
- **Per-chain dashboards** — price, market cap, blocks, hashrate, mempool, fees
- **Block / Transaction / Address detail** pages with copy-to-clipboard hashes
- **Smart search** — auto-detects tx hash, address, or block height and probes candidate chains in parallel
- **Multi-address portfolio** — track balances across multiple chains at once
- **Analytics (Infinitable)** — SQL-like queries over blocks, transactions, outputs, calls
- **Nodes explorer** — peer counts and node distribution per network
- **News feed** — multi-language crypto news from Blockchair
- **Tools** — halvening countdown, available data ranges
- **Broadcast** — push a signed raw transaction to supported networks

## Routes

| Path | Purpose | Blockchair endpoint |
| --- | --- | --- |
| `/` | Landing, global search, featured stats, feature map | `/stats` |
| `/chains` | All supported chains (greyed if unsupported) | — |
| `/$chain` | Chain dashboard | `/{chain}/stats` |
| `/$chain/block/$id` | Block detail | `/{chain}/dashboards/block/{id}` |
| `/$chain/transaction/$hash` | Transaction detail | `/{chain}/dashboards/transaction/{hash}` |
| `/$chain/address/$addr` | Address detail | `/{chain}/dashboards/address/{addr}` |
| `/$chain/nodes` | Network nodes | `/{chain}/nodes` |
| `/analytics` | Infinitable analytics queries | `/{chain}/{table}` |
| `/portfolio` | Multi-chain portfolio | `/multi/dashboards/addresses/{list}` |
| `/news` | News feed | `/news` |
| `/tools` | Halvening + ranges | `/tools/halvening`, `/range` |
| `/broadcast` | Push raw tx | `/{chain}/push/transaction` |
| `/search?q=…` | Smart redirect | (classifier) |

## Supported chains

17 mainnets, primarily UTXO-based: Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, Dash, Groestlcoin, Zcash, eCash, and others. EVM chains are listed but marked **N/A** — Blockchair's dashboard endpoints don't cover them on this plan. See `/chains` for the full list.

## Tech stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React 19, SSR, file-based routing)
- **Build**: Vite 7, deployed to Cloudflare Workers
- **Styling**: Tailwind CSS v4 with semantic tokens in `src/styles.css`
- **Data**: TanStack Query + `createServerFn` proxy to Blockchair
- **Backend**: Lovable Cloud (Supabase) for secret storage
- **Validation**: Zod on every server function input

## Architecture

All Blockchair calls go through server functions in `src/lib/blockchair.functions.ts`. The `BLOCKCHAIR_API_KEY` is stored as a server secret and appended server-side — it never reaches the browser, which also sidesteps CORS.

```
Browser ──► createServerFn (TanStack)
              └─► api.blockchair.com?key=…
```

## Local development

```bash
bun install
bun dev
```

Set `BLOCKCHAIR_API_KEY` as a secret in Lovable Cloud (or in `.env` for local dev). The publishable Supabase keys in `.env` are auto-managed.

## Project structure

```
src/
├── routes/                 # File-based routes (TanStack)
├── lib/
│   ├── blockchair.functions.ts  # All server functions
│   ├── chains.ts                # Chain registry + supported flag
│   └── format.ts                # Number / hash formatters
├── components/             # UI + shadcn primitives
└── integrations/supabase/  # Auto-generated client
```

---

## Credits

**Minh Duy Do** — Computer Science student passionate about building modern, high-performance web applications. Interested in AI, system design, and scalable software engineering.

- GitHub: [@dominhduy09](https://github.com/dominhduy09)
- LinkedIn: [duy-do-minh](https://linkedin.com/in/duy-do-minh-0b37501a9)
- Email: <dominhduy09@gmail.com>

Data powered by the [Blockchair API](https://blockchair.com/api/docs). Built on [Lovable](https://lovable.dev).
