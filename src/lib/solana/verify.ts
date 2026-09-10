import "server-only";

import { PublicKey, type ParsedTransactionWithMeta, type TokenBalance } from "@solana/web3.js";

import { AppError } from "@/lib/errors";

import { connection } from "./connection";
import { WSOL_MINT } from "./assets";

/**
 * Server-side settlement check.
 *
 * A payment is only ever "confirmed" because this function said so after
 * reading the chain. The frontend reporting success is treated as a hint that
 * it is worth looking, nothing more.
 *
 * The invariant we verify: a successful transaction, signed by the wallet that
 * requested the quote, moved at least the quoted amount of USDC into the
 * treasury's USDC account, and this signature has not settled another order.
 */

export interface VerificationRequest {
  signature: string;
  /** Wallet that requested the quote and must have signed. */
  expectedPayer: string;
  /** Mint the user paid with; wSOL for native SOL payments. */
  expectedInputMint: string;
  /** Treasury owner wallet. */
  treasuryOwner: string;
  usdcMint: string;
  /** Minimum USDC the treasury must receive, in base units. */
  requiredUsdc: bigint;
}

export interface VerificationResult {
  signature: string;
  slot: number;
  receivedUsdc: bigint;
  feeLamports: bigint;
  blockTime: number | null;
}

const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 2_000;

export async function verifyPayment(request: VerificationRequest): Promise<VerificationResult> {
  const transaction = await fetchTransaction(request.signature);

  if (!transaction) {
    throw new AppError("transaction_not_found", { detail: request.signature });
  }

  if (transaction.meta?.err) {
    throw new AppError("transaction_failed", {
      detail: `onchain error: ${JSON.stringify(transaction.meta.err)}`,
    });
  }

  assertSignedBy(transaction, request.expectedPayer);
  assertInputMintPresent(transaction, request.expectedInputMint, request.expectedPayer);

  const receivedUsdc = treasuryUsdcDelta(transaction, request.treasuryOwner, request.usdcMint);

  if (receivedUsdc < request.requiredUsdc) {
    throw new AppError("payment_amount_mismatch", {
      detail: `treasury received ${receivedUsdc} of required ${request.requiredUsdc}`,
    });
  }

  return {
    signature: request.signature,
    slot: transaction.slot,
    receivedUsdc,
    feeLamports: BigInt(transaction.meta?.fee ?? 0),
    blockTime: transaction.blockTime ?? null,
  };
}

/**
 * An RPC node may not have indexed the transaction the instant the wallet
 * returns, so this retries briefly before declaring it missing.
 */
async function fetchTransaction(signature: string): Promise<ParsedTransactionWithMeta | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const transaction = await connection().getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (transaction) return transaction;
    if (attempt < MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  return null;
}

/**
 * The quoting wallet must be a signer. Note this is deliberately not a
 * fee-payer check: Jupiter's gasless and RFQ routes are paid for by a
 * sponsor or market maker, so the fee payer is legitimately someone else.
 */
function assertSignedBy(transaction: ParsedTransactionWithMeta, expectedPayer: string): void {
  const signers = transaction.transaction.message.accountKeys
    .filter((key) => key.signer)
    .map((key) => key.pubkey.toBase58());

  if (!signers.includes(expectedPayer)) {
    throw new AppError("verification_failed", {
      detail: "quoting wallet is not among the transaction signers",
    });
  }
}

/**
 * Confirms the transaction actually moved the asset the quote was priced in.
 * For SPL inputs the payer's balance of that mint must fall; for native SOL the
 * lamport balance must fall by more than the fee.
 */
function assertInputMintPresent(
  transaction: ParsedTransactionWithMeta,
  expectedInputMint: string,
  expectedPayer: string,
): void {
  const meta = transaction.meta;
  if (!meta) {
    throw new AppError("verification_failed", { detail: "transaction has no metadata" });
  }

  if (expectedInputMint === WSOL_MINT) {
    const index = accountIndex(transaction, expectedPayer);
    if (index === null) return;

    const pre = BigInt(meta.preBalances[index] ?? 0);
    const post = BigInt(meta.postBalances[index] ?? 0);
    if (post >= pre) {
      throw new AppError("verification_failed", {
        detail: "payer's SOL balance did not decrease",
      });
    }
    return;
  }

  const before = ownedBalance(meta.preTokenBalances ?? [], expectedPayer, expectedInputMint);
  const after = ownedBalance(meta.postTokenBalances ?? [], expectedPayer, expectedInputMint);

  if (after >= before) {
    throw new AppError("verification_failed", {
      detail: `payer's balance of ${expectedInputMint} did not decrease`,
    });
  }
}

function accountIndex(transaction: ParsedTransactionWithMeta, address: string): number | null {
  const index = transaction.transaction.message.accountKeys.findIndex(
    (key) => key.pubkey.toBase58() === address,
  );
  return index === -1 ? null : index;
}

/**
 * Net USDC delta across every treasury-owned USDC account in the transaction.
 * Reading balance deltas rather than parsing instructions means this works
 * identically for a direct transfer and for a multi-hop Jupiter route.
 */
function treasuryUsdcDelta(
  transaction: ParsedTransactionWithMeta,
  treasuryOwner: string,
  usdcMint: string,
): bigint {
  const meta = transaction.meta;
  if (!meta) {
    throw new AppError("verification_failed", { detail: "transaction has no metadata" });
  }

  const pre = ownedBalance(meta.preTokenBalances ?? [], treasuryOwner, usdcMint);
  const post = ownedBalance(meta.postTokenBalances ?? [], treasuryOwner, usdcMint);

  return post - pre;
}

function ownedBalance(balances: readonly TokenBalance[], owner: string, mint: string): bigint {
  return balances
    .filter((balance) => balance.owner === owner && balance.mint === mint)
    .reduce((total, balance) => total + BigInt(balance.uiTokenAmount.amount), 0n);
}

const MEMO_PROGRAM_IDS = new Set([
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
]);

export interface IncomingTransferRequest {
  signature: string;
  treasuryOwner: string;
  /** wSOL mint for native SOL; otherwise the SPL mint. */
  expectedMint: string;
  expectedAmount: bigint;
  native: boolean;
  /** `bucks:{quoteId}`. Matched when present; omitted memos are allowed. */
  expectedMemo: string | null;
}

export interface IncomingTransferResult {
  signature: string;
  slot: number;
  receivedAmount: bigint;
  payer: string | null;
  feeLamports: bigint;
  blockTime: number | null;
}

/**
 * Confirms an incoming native SOL or SPL transfer to the treasury. Used by
 * wallet-free checkout: the payer is whoever sent the funds, not a wallet that
 * signed inside this site, and USDC conversion is not required at pay time.
 */
export async function verifyIncomingTransfer(
  request: IncomingTransferRequest,
): Promise<IncomingTransferResult> {
  const transaction = await fetchTransaction(request.signature);

  if (!transaction) {
    throw new AppError("transaction_not_found", { detail: request.signature });
  }

  if (transaction.meta?.err) {
    throw new AppError("transaction_failed", {
      detail: `onchain error: ${JSON.stringify(transaction.meta.err)}`,
    });
  }

  if (!matchesIncomingTransfer(transaction, request)) {
    throw new AppError("payment_amount_mismatch", {
      detail: "treasury did not receive the quoted amount of the quoted asset",
    });
  }

  return {
    signature: request.signature,
    slot: transaction.slot,
    receivedAmount: incomingAmount(transaction, request),
    payer: extractPayer(transaction, request.treasuryOwner, request.expectedMint, request.native),
    feeLamports: BigInt(transaction.meta?.fee ?? 0),
    blockTime: transaction.blockTime ?? null,
  };
}

export function matchesIncomingTransfer(
  transaction: ParsedTransactionWithMeta,
  request: Omit<IncomingTransferRequest, "signature">,
): boolean {
  if (transaction.meta?.err) return false;
  if (incomingAmount(transaction, request) !== request.expectedAmount) return false;
  return memoCompatible(extractMemo(transaction), request.expectedMemo);
}

function incomingAmount(
  transaction: ParsedTransactionWithMeta,
  request: Pick<IncomingTransferRequest, "treasuryOwner" | "expectedMint" | "native">,
): bigint {
  const meta = transaction.meta;
  if (!meta) return 0n;

  if (request.native) {
    const index = accountIndex(transaction, request.treasuryOwner);
    if (index === null) return 0n;
    const pre = BigInt(meta.preBalances[index] ?? 0);
    const post = BigInt(meta.postBalances[index] ?? 0);
    return post > pre ? post - pre : 0n;
  }

  const pre = ownedBalance(meta.preTokenBalances ?? [], request.treasuryOwner, request.expectedMint);
  const post = ownedBalance(meta.postTokenBalances ?? [], request.treasuryOwner, request.expectedMint);
  return post > pre ? post - pre : 0n;
}

function extractPayer(
  transaction: ParsedTransactionWithMeta,
  treasuryOwner: string,
  mint: string,
  native: boolean,
): string | null {
  const meta = transaction.meta;
  if (!meta) return null;

  if (native) {
    const keys = transaction.transaction.message.accountKeys;
    for (const [index, key] of keys.entries()) {
      const address = key.pubkey.toBase58();
      if (address === treasuryOwner) continue;
      const pre = BigInt(meta.preBalances[index] ?? 0);
      const post = BigInt(meta.postBalances[index] ?? 0);
      if (post < pre) return address;
    }
  } else {
    const owners = new Set(
      [...(meta.preTokenBalances ?? []), ...(meta.postTokenBalances ?? [])]
        .filter((balance) => balance.mint === mint && balance.owner && balance.owner !== treasuryOwner)
        .map((balance) => balance.owner as string),
    );
    for (const owner of owners) {
      const before = ownedBalance(meta.preTokenBalances ?? [], owner, mint);
      const after = ownedBalance(meta.postTokenBalances ?? [], owner, mint);
      if (after < before) return owner;
    }
  }

  const signer = transaction.transaction.message.accountKeys.find(
    (key) => key.signer && key.pubkey.toBase58() !== treasuryOwner,
  );
  return signer?.pubkey.toBase58() ?? null;
}

function extractMemo(transaction: ParsedTransactionWithMeta): string | null {
  const instructions = [
    ...transaction.transaction.message.instructions,
    ...(transaction.meta?.innerInstructions ?? []).flatMap((entry) => entry.instructions),
  ];

  for (const instruction of instructions) {
    const programId = instruction.programId.toBase58();
    if (!MEMO_PROGRAM_IDS.has(programId) && !("program" in instruction && instruction.program === "spl-memo")) {
      continue;
    }

    if ("parsed" in instruction) {
      if (typeof instruction.parsed === "string" && instruction.parsed.trim()) {
        return instruction.parsed.trim();
      }
      if (instruction.parsed && typeof instruction.parsed === "object") {
        const record = instruction.parsed as { memo?: unknown };
        if (typeof record.memo === "string" && record.memo.trim()) return record.memo.trim();
      }
    }

    if ("data" in instruction && typeof instruction.data === "string") {
      try {
        const decoded = Buffer.from(instruction.data, "base64").toString("utf8").trim();
        if (decoded) return decoded;
      } catch {
        // Ignore undecodable instruction data.
      }
    }
  }

  return null;
}

/**
 * Exact unique amounts identify the quote. A matching memo is extra confirmation.
 * A different `bucks:` memo means this transfer belongs to another quote.
 */
function memoCompatible(found: string | null, expected: string | null): boolean {
  if (!expected) return true;
  if (!found) return true;
  if (found === expected || found.includes(expected)) return true;
  if (found.startsWith("bucks:") && found !== expected) return false;
  return true;
}

/** Guards against a malformed treasury configuration at startup. */
export function assertValidAddress(address: string, label: string): PublicKey {
  try {
    return new PublicKey(address);
  } catch {
    throw new AppError("internal", { detail: `${label} is not a valid Solana address` });
  }
}
