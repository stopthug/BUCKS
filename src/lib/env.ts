import "server-only";

import { z } from "zod";

/**
 * Server-side environment. Importing this from a client component is a build
 * error thanks to `server-only`, which keeps provider credentials out of the
 * browser bundle.
 */

const base58Mint = z
  .string()
  .trim()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "must be a base58 Solana address");

const optionalBase58Mint = z
  .union([base58Mint, z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalUrl = z
  .union([z.string().trim().url(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z
    .string()
    .trim()
    .min(1, "ENCRYPTION_KEY is required")
    .describe("32 bytes, hex or base64 encoded"),
  APP_URL: z.string().trim().url(),

  SOLANA_RPC_URL: z.string().trim().url(),
  JUPITER_API_KEY: z.string().trim().optional(),
  JUPITER_API_BASE_URL: z.string().trim().url().default("https://api.jup.ag/swap/v2"),

  USDC_MINT: base58Mint.default("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  SBUXX_MINT: optionalBase58Mint,
  BUCKS_MINT: optionalBase58Mint,

  /** Wallet that receives USDC for every purchase. */
  TREASURY_WALLET: base58Mint,

  FAZER_API_KEY: z.string().trim().optional(),
  FAZER_API_BASE_URL: z.string().trim().url().default("https://api.fzr.cards/api/v2"),
  FAZER_WEBHOOK_SECRET: z.string().trim().optional(),

  BUCKS_SBUXX_PAIR_ADDRESS: z.string().trim().optional(),
  BUCKS_TRADE_URL: optionalUrl,
  DEXSCREENER_URL: optionalUrl,

  /**
   * Development-only escape hatch. When enabled (and NODE_ENV !== production)
   * the FazerCards client answers from an isolated local fixture instead of
   * the live provider, so the UI can be exercised without a reseller account.
   * Ignored in production — never activates checkout against fake inventory.
   */
  FAZER_DEV_MOCK: z
    .enum(["0", "1"])
    .default("0")
    .transform((value) => value === "1"),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

function load(): ServerEnv {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration.\n${issues}\n\nCopy .env.example to .env.local and fill in the values.`,
    );
  }

  if (parsed.data.NODE_ENV === "production" && parsed.data.FAZER_DEV_MOCK) {
    // Vercel copies of .env.local often still have FAZER_DEV_MOCK=1. Ignore it
    // rather than refusing to boot the whole site.
    parsed.data.FAZER_DEV_MOCK = false;
  }

  return parsed.data;
}

export function env(): ServerEnv {
  cached ??= load();
  return cached;
}

/** True when the FazerCards integration has credentials to talk to the provider. */
export function hasFazerCredentials(): boolean {
  const config = env();
  return Boolean(config.FAZER_API_KEY) || config.FAZER_DEV_MOCK;
}

export function isProduction(): boolean {
  return env().NODE_ENV === "production";
}
