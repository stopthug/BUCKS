import "server-only";

import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

import type { QuoteRow } from "@/lib/db/queries";
import { env } from "@/lib/env";

import { connection } from "./connection";
import { matchesIncomingTransfer } from "./verify";

/**
 * Scans recent treasury signatures for a transfer that matches a live quote:
 * exact unique amount of the quoted asset, plus memo when the wallet attached one.
 */

const LOOKBACK = 80;
const CREATED_SLACK_MS = 20_000;

export async function findTreasuryPayment(quote: QuoteRow): Promise<string | null> {
  const conn = connection();
  const treasury = new PublicKey(env().TREASURY_WALLET);
  const native = quote.paymentAsset === "SOL";
  const mint = new PublicKey(quote.paymentMint);
  const watchAddress = native ? treasury : getAssociatedTokenAddressSync(mint, treasury);

  const signatures = await conn.getSignaturesForAddress(watchAddress, { limit: LOOKBACK });
  const createdMs = quote.createdAt.getTime();

  const request = {
    treasuryOwner: treasury.toBase58(),
    expectedMint: quote.paymentMint,
    expectedAmount: quote.paymentAmount,
    native,
    expectedMemo: quote.paymentMemo,
  };

  for (const info of signatures) {
    if (info.err) continue;
    if (info.blockTime && info.blockTime * 1000 < createdMs - CREATED_SLACK_MS) continue;

    const transaction = await conn.getParsedTransaction(info.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!transaction) continue;
    if (matchesIncomingTransfer(transaction, request)) return info.signature;
  }

  return null;
}
