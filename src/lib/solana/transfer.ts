import "server-only";

import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { AppError } from "@/lib/errors";

import { connection } from "./connection";

/**
 * USDC is already the settlement asset, so a USDC payment is a plain SPL
 * transfer to the treasury. Routing it through a swap would cost the user
 * money for nothing.
 */

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const COMPUTE_UNIT_LIMIT = 60_000;
const COMPUTE_UNIT_PRICE_MICRO_LAMPORTS = 40_000;

export interface DirectTransferResult {
  /** Base64 unsigned versioned transaction. */
  transaction: string;
  lastValidBlockHeight: number;
  destinationTokenAccount: string;
  estimatedFeeLamports: bigint;
}

export async function buildUsdcTransfer(input: {
  payer: string;
  treasury: string;
  usdcMint: string;
  usdcDecimals: number;
  amount: bigint;
  /** Opaque reference written to a memo so payments reconcile against quotes. */
  reference: string;
}): Promise<DirectTransferResult> {
  const payer = new PublicKey(input.payer);
  const treasury = new PublicKey(input.treasury);
  const mint = new PublicKey(input.usdcMint);

  const source = getAssociatedTokenAddressSync(mint, payer);
  const destination = getAssociatedTokenAddressSync(mint, treasury);

  await assertSufficientTokenBalance(source, input.amount);

  const instructions: TransactionInstruction[] = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: COMPUTE_UNIT_PRICE_MICRO_LAMPORTS,
    }),
    // Idempotent: a no-op when the treasury account already exists.
    createAssociatedTokenAccountIdempotentInstruction(payer, destination, treasury, mint),
    createTransferCheckedInstruction(
      source,
      mint,
      destination,
      payer,
      input.amount,
      input.usdcDecimals,
      [],
      TOKEN_PROGRAM_ID,
    ),
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      data: Buffer.from(`bucks:${input.reference}`, "utf8"),
    }),
  ];

  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  await assertSufficientLamports(payer);

  return {
    transaction: Buffer.from(transaction.serialize()).toString("base64"),
    lastValidBlockHeight,
    destinationTokenAccount: destination.toBase58(),
    estimatedFeeLamports: 5_000n,
  };
}

async function assertSufficientTokenBalance(tokenAccount: PublicKey, amount: bigint): Promise<void> {
  try {
    const balance = await connection().getTokenAccountBalance(tokenAccount);
    if (BigInt(balance.value.amount) < amount) {
      throw new AppError("insufficient_balance", {
        detail: "USDC token account balance below quote",
      });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    // A missing token account means a zero balance.
    throw new AppError("insufficient_balance", { detail: "no USDC token account" });
  }
}

/** Rent for a possible destination ATA plus the signature fee. */
const MIN_LAMPORTS_FOR_FEES = 2_100_000n;

async function assertSufficientLamports(payer: PublicKey): Promise<void> {
  const lamports = BigInt(await connection().getBalance(payer, "confirmed"));
  if (lamports < MIN_LAMPORTS_FOR_FEES) {
    throw new AppError("insufficient_sol_for_fees", {
      detail: `payer holds ${lamports} lamports`,
    });
  }
}

/**
 * Submits a user-signed transaction and waits for confirmation. Used for the
 * direct USDC path; swap payments are landed by Jupiter's `/execute`.
 */
export async function submitSignedTransaction(input: {
  signedTransaction: string;
  lastValidBlockHeight?: number;
}): Promise<string> {
  const raw = Buffer.from(input.signedTransaction, "base64");

  let signature: string;
  try {
    signature = await connection().sendRawTransaction(raw, {
      skipPreflight: false,
      maxRetries: 3,
      preflightCommitment: "confirmed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/insufficient (funds|lamports)/i.test(message)) {
      throw new AppError("insufficient_balance", { detail: message });
    }
    if (/blockhash not found|block height exceeded/i.test(message)) {
      throw new AppError("quote_expired", { detail: message });
    }
    throw new AppError("transaction_failed", { detail: message });
  }

  await waitForConfirmation(signature, input.lastValidBlockHeight);
  return signature;
}

async function waitForConfirmation(signature: string, lastValidBlockHeight?: number): Promise<void> {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const status = await connection().getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    const value = status.value;

    if (value?.err) {
      throw new AppError("transaction_failed", { detail: JSON.stringify(value.err) });
    }

    if (value?.confirmationStatus === "confirmed" || value?.confirmationStatus === "finalized") {
      return;
    }

    if (lastValidBlockHeight !== undefined) {
      const height = await connection().getBlockHeight("confirmed");
      if (height > lastValidBlockHeight && !value) {
        throw new AppError("quote_expired", { detail: "blockhash expired before confirmation" });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }

  // Not a failure: verification will pick it up once the RPC catches up.
  throw new AppError("payment_pending", { detail: "confirmation timed out" });
}
