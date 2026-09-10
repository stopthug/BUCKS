import "server-only";

import { PublicKey } from "@solana/web3.js";

import { getSupportedAssets, type AssetConfig } from "./assets";
import { connection } from "./connection";

/**
 * Wallet balances are read server-side so the checkout screen shows the same
 * numbers the quoting logic uses, from the same RPC.
 */

export interface AssetBalance {
  symbol: string;
  label: string;
  mint: string;
  decimals: number;
  /** Base units, serialised as a string for JSON safety. */
  amount: string;
}

export async function getWalletBalances(address: string): Promise<AssetBalance[]> {
  const owner = new PublicKey(address);
  const assets = await getSupportedAssets();

  const [lamports, tokenAccounts] = await Promise.all([
    connection().getBalance(owner, "confirmed"),
    connection().getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM }, "confirmed"),
  ]);

  const byMint = new Map<string, bigint>();
  for (const { account } of tokenAccounts.value) {
    const info = account.data.parsed?.info as
      | { mint?: string; tokenAmount?: { amount?: string } }
      | undefined;
    const mint = info?.mint;
    const amount = info?.tokenAmount?.amount;
    if (!mint || amount === undefined) continue;
    byMint.set(mint, (byMint.get(mint) ?? 0n) + BigInt(amount));
  }

  return assets.map((asset) => ({
    symbol: asset.symbol,
    label: asset.label,
    mint: asset.mint,
    decimals: asset.decimals,
    amount: (asset.isNative ? BigInt(lamports) : (byMint.get(asset.mint) ?? 0n)).toString(),
  }));
}

export async function getAssetBalance(address: string, asset: AssetConfig): Promise<bigint> {
  const owner = new PublicKey(address);

  if (asset.isNative) {
    return BigInt(await connection().getBalance(owner, "confirmed"));
  }

  const accounts = await connection().getParsedTokenAccountsByOwner(
    owner,
    { mint: new PublicKey(asset.mint) },
    "confirmed",
  );

  return accounts.value.reduce((total, { account }) => {
    const amount = (
      account.data.parsed?.info as { tokenAmount?: { amount?: string } } | undefined
    )?.tokenAmount?.amount;
    return amount ? total + BigInt(amount) : total;
  }, 0n);
}

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
