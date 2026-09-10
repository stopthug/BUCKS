import "server-only";

import { PublicKey } from "@solana/web3.js";

import { query } from "@/lib/db/client";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

import { connection } from "./connection";

/**
 * The four assets checkout accepts, resolved from verified mint addresses.
 *
 * A symbol is never authoritative: `$BUCKS` means "whatever `BUCKS_MINT` says",
 * and decimals are read from the mint account onchain so a wrong value in the
 * environment cannot mis-scale a payment amount.
 */

export const WSOL_MINT = "So11111111111111111111111111111111111111112";

export type AssetSymbol = "BUCKS" | "SBUXx" | "SOL" | "USDC";

export interface AssetConfig {
  symbol: AssetSymbol;
  /** Display label used in the UI. */
  label: string;
  mint: string;
  decimals: number;
  /** SOL pays from the native balance; the mint is only used for routing. */
  isNative: boolean;
  sortOrder: number;
}

interface AssetDefinition {
  symbol: AssetSymbol;
  label: string;
  mint: string | undefined;
  fallbackDecimals: number;
  isNative: boolean;
  sortOrder: number;
}

function definitions(): AssetDefinition[] {
  const config = env();
  return [
    {
      symbol: "BUCKS",
      label: "$BUCKS",
      mint: config.BUCKS_MINT,
      fallbackDecimals: 6,
      isNative: false,
      sortOrder: 1,
    },
    {
      symbol: "SBUXx",
      label: "SBUXx",
      mint: config.SBUXX_MINT,
      fallbackDecimals: 6,
      isNative: false,
      sortOrder: 2,
    },
    {
      symbol: "SOL",
      label: "SOL",
      mint: WSOL_MINT,
      fallbackDecimals: 9,
      isNative: true,
      sortOrder: 3,
    },
    {
      symbol: "USDC",
      label: "USDC",
      mint: config.USDC_MINT,
      fallbackDecimals: 6,
      isNative: false,
      sortOrder: 4,
    },
  ];
}

const DECIMALS_TTL_MS = 60 * 60 * 1000;

const globalForAssets = globalThis as unknown as {
  bucksAssets?: { value: AssetConfig[]; expiresAt: number };
  bucksAssetsRegistered?: boolean;
};

async function readDecimals(mint: string, fallback: number): Promise<number> {
  try {
    const info = await connection().getParsedAccountInfo(new PublicKey(mint));
    const data = info.value?.data;
    if (data && "parsed" in data) {
      const decimals = (data.parsed as { info?: { decimals?: unknown } }).info?.decimals;
      if (typeof decimals === "number") return decimals;
    }
  } catch {
    // Fall through: a transient RPC failure should not take checkout down.
  }
  return fallback;
}

/**
 * Keeps `supported_assets` in step with the environment. The table is the
 * referential anchor for quotes; the environment is the source of truth.
 */
async function registerAssets(assets: AssetConfig[]): Promise<void> {
  if (globalForAssets.bucksAssetsRegistered) return;

  for (const asset of assets) {
    await query(
      `INSERT INTO supported_assets (symbol, mint, decimals, is_native, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (symbol) DO UPDATE
         SET mint = EXCLUDED.mint,
             decimals = EXCLUDED.decimals,
             is_native = EXCLUDED.is_native,
             sort_order = EXCLUDED.sort_order,
             updated_at = now()`,
      [asset.symbol, asset.mint, asset.decimals, asset.isNative, asset.sortOrder],
    );
  }

  globalForAssets.bucksAssetsRegistered = true;
}

/** Assets with a configured mint, in display order. */
export async function getSupportedAssets(): Promise<AssetConfig[]> {
  const cached = globalForAssets.bucksAssets;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const resolved: AssetConfig[] = [];

  for (const definition of definitions()) {
    if (!definition.mint) continue;

    resolved.push({
      symbol: definition.symbol,
      label: definition.label,
      mint: definition.mint,
      decimals: await readDecimals(definition.mint, definition.fallbackDecimals),
      isNative: definition.isNative,
      sortOrder: definition.sortOrder,
    });
  }

  resolved.sort((a, b) => a.sortOrder - b.sortOrder);
  globalForAssets.bucksAssets = { value: resolved, expiresAt: Date.now() + DECIMALS_TTL_MS };
  await registerAssets(resolved);

  return resolved;
}

export async function getAsset(symbol: string): Promise<AssetConfig> {
  const assets = await getSupportedAssets();
  const asset = assets.find((entry) => entry.symbol === symbol);

  if (!asset) {
    throw new AppError("asset_not_configured", { detail: `${symbol} has no configured mint` });
  }

  return asset;
}

export async function getUsdcAsset(): Promise<AssetConfig> {
  return getAsset("USDC");
}

export function treasuryWallet(): PublicKey {
  return new PublicKey(env().TREASURY_WALLET);
}
