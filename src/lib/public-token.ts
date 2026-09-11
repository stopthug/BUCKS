/** Public $BUCKS mint. Safe to show in the browser. */
export const BUCKS_MINT = "6UcPKa4Y8QuZrhLb8eKD6jcXHaZFC7nUUcEfGFs1KYwP";

/** Live Raydium BUCKS/SOL pair, as Dex Screener reports it. */
export const BUCKS_DEX_PAIR = "4GPKNeeqNSqQPKZf2sPcc8ixfwWM7kNqe4heMiWiCoDe";

export const DEXSCREENER_TOKEN_URL = `https://dexscreener.com/solana/${BUCKS_DEX_PAIR}`;

export function shortenMint(mint: string): string {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
