import "server-only";

import { z } from "zod";

/**
 * Server-side environment. Importing this from a client component is a build
 * error thanks to `server-only`, which keeps provider credentials out of the
 * browser bundle.
 *
 * Each variable is read as `process.env.NAME` (not a dynamic lookup) so Next.js
 * and Vercel keep the key in the serverless runtime.
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

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const trimmed = value.trim().replace(/^["']|["']$/g, "").trim();
    return trimmed || undefined;
  });

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
  JUPITER_API_KEY: optionalSecret,
  JUPITER_API_BASE_URL: z.string().trim().url().default("https://api.jup.ag/swap/v2"),

  USDC_MINT: base58Mint.default("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  SBUXX_MINT: optionalBase58Mint.default("Xs9gd8SGbYQn9kkUYQayn46BdqQbvvUshEF6ZpRAzM7"),
  BUCKS_MINT: optionalBase58Mint,

  /** Wallet that receives USDC for every purchase. */
  TREASURY_WALLET: base58Mint,

  FAZER_API_KEY: optionalSecret,
  FAZER_API_BASE_URL: z.string().trim().url().default("https://api.fzr.cards/api/v2"),
  FAZER_WEBHOOK_SECRET: optionalSecret,

  BUCKS_SBUXX_PAIR_ADDRESS: z.string().trim().optional(),
  BUCKS_TRADE_URL: optionalUrl,
  DEXSCREENER_URL: optionalUrl,

  /**
   * Development-only escape hatch. Empty / unset / "0" is off. Ignored in
   * production — never activates checkout against fake inventory.
   */
  FAZER_DEV_MOCK: z.preprocess((value) => {
    if (value === "1" || value === "true") return "1";
    return "0";
  }, z.enum(["0", "1"]).transform((value) => value === "1")),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

function blank(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "").trim();
  return trimmed || undefined;
}

function vercelAppUrl(): string | undefined {
  const configured = blank(process.env.APP_URL);
  if (configured) return configured;
  const production = blank(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (production) return production.startsWith("http") ? production : `https://${production}`;
  const deployment = blank(process.env.VERCEL_URL);
  if (deployment) return `https://${deployment}`;
  return undefined;
}

/**
 * Static `process.env.NAME` reads. Passing `process.env` straight into Zod
 * can drop keys Next.js did not see referenced at build time.
 */
function fromProcess(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: blank(process.env.DATABASE_URL)
      ?? blank(process.env.POSTGRES_PRISMA_URL)
      ?? blank(process.env.POSTGRES_URL)
      ?? blank(process.env.POSTGRES_URL_NON_POOLING),
    SESSION_SECRET: blank(process.env.SESSION_SECRET),
    ENCRYPTION_KEY: blank(process.env.ENCRYPTION_KEY),
    APP_URL: vercelAppUrl(),
    SOLANA_RPC_URL: blank(process.env.SOLANA_RPC_URL) ?? "https://api.mainnet-beta.solana.com",
    JUPITER_API_KEY: blank(process.env.JUPITER_API_KEY),
    JUPITER_API_BASE_URL: blank(process.env.JUPITER_API_BASE_URL),
    USDC_MINT: blank(process.env.USDC_MINT),
    SBUXX_MINT: blank(process.env.SBUXX_MINT),
    BUCKS_MINT: blank(process.env.BUCKS_MINT),
    TREASURY_WALLET: blank(process.env.TREASURY_WALLET),
    FAZER_API_KEY: blank(process.env.FAZER_API_KEY),
    FAZER_API_BASE_URL: blank(process.env.FAZER_API_BASE_URL),
    FAZER_WEBHOOK_SECRET: blank(process.env.FAZER_WEBHOOK_SECRET),
    BUCKS_SBUXX_PAIR_ADDRESS: blank(process.env.BUCKS_SBUXX_PAIR_ADDRESS),
    BUCKS_TRADE_URL: blank(process.env.BUCKS_TRADE_URL),
    DEXSCREENER_URL: blank(process.env.DEXSCREENER_URL),
    FAZER_DEV_MOCK: blank(process.env.FAZER_DEV_MOCK),
  };
}

function load(): ServerEnv {
  const parsed = schema.safeParse(fromProcess());

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration.\n${issues}\n\nCopy .env.example to .env.local and fill in the values.`,
    );
  }

  if (parsed.data.NODE_ENV === "production" && parsed.data.FAZER_DEV_MOCK) {
    parsed.data.FAZER_DEV_MOCK = false;
  }

  return parsed.data;
}

export function env(): ServerEnv {
  if (process.env.NODE_ENV !== "production") {
    return load();
  }
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

export interface EnvStatus {
  ok: boolean;
  hasFazerKey: boolean;
  missing: string[];
}

/** Safe diagnostics: names only, never values. */
export function envStatus(): EnvStatus {
  const parsed = schema.safeParse(fromProcess());
  const raw = fromProcess();
  const hasFazerKey = Boolean(raw.FAZER_API_KEY?.trim().replace(/^["']|["']$/g, ""));

  if (parsed.success) {
    return { ok: true, hasFazerKey: Boolean(parsed.data.FAZER_API_KEY), missing: [] };
  }

  const missing = [
    ...new Set(
      parsed.error.issues.map((issue) => issue.path.join(".") || "(root)"),
    ),
  ];
  return { ok: false, hasFazerKey, missing };
}
