// Blockchair-supported chains with their slugs (as used in API paths)
// and display metadata.

export type ChainCategory = "utxo" | "evm" | "other";

export type Chain = {
  slug: string;
  name: string;
  ticker: string;
  category: ChainCategory;
  color: string; // hex accent
  // Whether dashboards/{block,transaction,address} are supported.
  // Most chains support all three. Some (like Beacon Chain) are stats-only.
  hasDashboards?: boolean;
};

export const CHAINS: Chain[] = [
  // UTXO / Bitcoin-like
  { slug: "bitcoin", name: "Bitcoin", ticker: "BTC", category: "utxo", color: "#f7931a" },
  { slug: "bitcoin-cash", name: "Bitcoin Cash", ticker: "BCH", category: "utxo", color: "#0ac18e" },
  { slug: "litecoin", name: "Litecoin", ticker: "LTC", category: "utxo", color: "#a6a9aa" },
  { slug: "dogecoin", name: "Dogecoin", ticker: "DOGE", category: "utxo", color: "#c2a633" },
  { slug: "dash", name: "Dash", ticker: "DASH", category: "utxo", color: "#008ce7" },
  { slug: "groestlcoin", name: "Groestlcoin", ticker: "GRS", category: "utxo", color: "#0689c8" },
  { slug: "zcash", name: "Zcash", ticker: "ZEC", category: "utxo", color: "#ecb244" },
  { slug: "ecash", name: "eCash", ticker: "XEC", category: "utxo", color: "#0074c2" },
  { slug: "digibyte", name: "DigiByte", ticker: "DGB", category: "utxo", color: "#0066cc" },
  { slug: "peercoin", name: "Peercoin", ticker: "PPC", category: "utxo", color: "#3cb054" },

  // EVM
  { slug: "ethereum", name: "Ethereum", ticker: "ETH", category: "evm", color: "#627eea" },
  { slug: "ethereum-classic", name: "Ethereum Classic", ticker: "ETC", category: "evm", color: "#3ab83a" },
  { slug: "polygon", name: "Polygon", ticker: "MATIC", category: "evm", color: "#8247e5" },
  { slug: "bnb", name: "BNB Chain", ticker: "BNB", category: "evm", color: "#f3ba2f" },
  { slug: "avalanche", name: "Avalanche", ticker: "AVAX", category: "evm", color: "#e84142" },
  { slug: "arbitrum-one", name: "Arbitrum One", ticker: "ARB", category: "evm", color: "#28a0f0" },
  { slug: "optimism", name: "Optimism", ticker: "OP", category: "evm", color: "#ff0420" },
  { slug: "base", name: "Base", ticker: "ETH", category: "evm", color: "#0052ff" },
  { slug: "fantom", name: "Fantom", ticker: "FTM", category: "evm", color: "#1969ff" },
  { slug: "gnosis-chain", name: "Gnosis Chain", ticker: "GNO", category: "evm", color: "#3e6957" },
  { slug: "moonbeam", name: "Moonbeam", ticker: "GLMR", category: "evm", color: "#53cbc8" },
  { slug: "linea", name: "Linea", ticker: "ETH", category: "evm", color: "#121212" },
  { slug: "polygon-zkevm", name: "Polygon zkEVM", ticker: "ETH", category: "evm", color: "#8247e5" },
  { slug: "rootstock", name: "Rootstock", ticker: "RBTC", category: "evm", color: "#00b520" },
  { slug: "opbnb", name: "opBNB", ticker: "BNB", category: "evm", color: "#f3ba2f" },
  { slug: "sei-evm", name: "Sei EVM", ticker: "SEI", category: "evm", color: "#a52423" },
  { slug: "bob", name: "BOB", ticker: "ETH", category: "evm", color: "#f25d00" },
  { slug: "botanix", name: "Botanix", ticker: "BTC", category: "evm", color: "#f7931a" },

  // Other L1s
  { slug: "cardano", name: "Cardano", ticker: "ADA", category: "other", color: "#0033ad" },
  { slug: "ripple", name: "XRP Ledger", ticker: "XRP", category: "other", color: "#00aae4" },
  { slug: "stellar", name: "Stellar", ticker: "XLM", category: "other", color: "#08b5e5" },
  { slug: "monero", name: "Monero", ticker: "XMR", category: "other", color: "#ff6600" },
  { slug: "solana", name: "Solana", ticker: "SOL", category: "other", color: "#14f195" },
  { slug: "tron", name: "TRON", ticker: "TRX", category: "other", color: "#ff060a" },
  { slug: "polkadot", name: "Polkadot", ticker: "DOT", category: "other", color: "#e6007a" },
  { slug: "kusama", name: "Kusama", ticker: "KSM", category: "other", color: "#000000" },
  { slug: "aptos", name: "Aptos", ticker: "APT", category: "other", color: "#06d6a0" },
  { slug: "ton", name: "The Open Network", ticker: "TON", category: "other", color: "#0098ea" },
  { slug: "handshake", name: "Handshake", ticker: "HNS", category: "other", color: "#000000" },
  { slug: "liquid-network", name: "Liquid Network", ticker: "L-BTC", category: "other", color: "#00c8c8" },
  { slug: "beacon-chain", name: "Beacon Chain", ticker: "ETH", category: "other", color: "#627eea", hasDashboards: false },
];

export const CHAIN_SLUGS = CHAINS.map((c) => c.slug);

export function getChain(slug: string): Chain | undefined {
  return CHAINS.find((c) => c.slug === slug);
}

export function isValidChain(slug: string): boolean {
  return CHAIN_SLUGS.includes(slug);
}
