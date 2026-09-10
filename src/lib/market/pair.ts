import "server-only";

import { z } from "zod";

import { env } from "@/lib/env";

/**
 * $BUCKS / SBUXx market data.
 *
 * There is exactly one source: the DEX pair address in the environment, read
 * through Dexscreener. If it is not configured, or the pair does not resolve,
 * the answer is "not configured" and the UI says the pair is coming soon.
 * Nothing here ever synthesises a price, a chart, or a volume figure.
 */

const pairSchema = z.object({
  chainId: z.string().optional(),
  dexId: z.string().optional(),
  url: z.string().optional(),
  pairAddress: z.string(),
  baseToken: z.object({ address: z.string(), name: z.string().optional(), symbol: z.string() }),
  quoteToken: z.object({ address: z.string(), name: z.string().optional(), symbol: z.string() }),
  priceNative: z.string().optional(),
  priceUsd: z.string().optional(),
  liquidity: z.object({ usd: z.number().optional() }).optional(),
  volume: z.object({ h24: z.number().optional() }).optional(),
  priceChange: z.object({ h24: z.number().optional() }).optional(),
  fdv: z.number().optional(),
});

const responseSchema = z.object({
  pairs: z.array(pairSchema).nullable().optional(),
  pair: pairSchema.nullable().optional(),
});

export interface PairMarket {
  configured: boolean;
  pairAddress: string | null;
  /** Price of the base token in the quote token, as the DEX reports it. */
  priceNative: string | null;
  priceUsd: string | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  priceChange24hPct: number | null;
  baseSymbol: string | null;
  quoteSymbol: string | null;
  dexId: string | null;
  tradeUrl: string | null;
  dexscreenerUrl: string | null;
  fetchedAt: string;
}

const CACHE_TTL_MS = 60_000;

const globalForMarket = globalThis as unknown as {
  bucksPairMarket?: { value: PairMarket; expiresAt: number };
};

function unconfigured(): PairMarket {
  const config = env();
  return {
    configured: false,
    pairAddress: null,
    priceNative: null,
    priceUsd: null,
    liquidityUsd: null,
    volume24hUsd: null,
    priceChange24hPct: null,
    baseSymbol: null,
    quoteSymbol: null,
    dexId: null,
    tradeUrl: config.BUCKS_TRADE_URL ?? null,
    dexscreenerUrl: config.DEXSCREENER_URL ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getPairMarket(): Promise<PairMarket> {
  const cached = globalForMarket.bucksPairMarket;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const config = env();
  const pairAddress = config.BUCKS_SBUXX_PAIR_ADDRESS?.trim();

  if (!pairAddress) return unconfigured();

  const market = await fetchPair(pairAddress);
  const value = market ?? { ...unconfigured(), pairAddress };

  globalForMarket.bucksPairMarket = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function fetchPair(pairAddress: string): Promise<PairMarket | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/solana/${encodeURIComponent(pairAddress)}`,
      { signal: controller.signal, headers: { Accept: "application/json" }, cache: "no-store" },
    );

    if (!response.ok) return null;

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const pair = parsed.data.pair ?? parsed.data.pairs?.[0];
    if (!pair) return null;

    const config = env();

    return {
      configured: true,
      pairAddress: pair.pairAddress,
      priceNative: pair.priceNative ?? null,
      priceUsd: pair.priceUsd ?? null,
      liquidityUsd: pair.liquidity?.usd ?? null,
      volume24hUsd: pair.volume?.h24 ?? null,
      priceChange24hPct: pair.priceChange?.h24 ?? null,
      baseSymbol: pair.baseToken.symbol,
      quoteSymbol: pair.quoteToken.symbol,
      dexId: pair.dexId ?? null,
      tradeUrl: config.BUCKS_TRADE_URL ?? null,
      dexscreenerUrl: config.DEXSCREENER_URL ?? pair.url ?? null,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
