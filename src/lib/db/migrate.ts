/**
 * Applies src/lib/db/schema.sql. The schema is written to be idempotent, so
 * this doubles as "create" and "bring up to date".
 *
 *   npm run db:migrate
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { Pool } from "pg";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
  }

  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  const needsTls = !/localhost|127\.0\.0\.1/.test(connectionString);

  const pool = new Pool({
    connectionString,
    ssl: needsTls ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(sql);
    await seedConfiguredAssets(pool);
    console.log("migration applied");
  } finally {
    await pool.end();
  }
}

/**
 * Mints come from the environment so a symbol can never be trusted on its own.
 * Assets without a configured mint stay absent from the table, which is what
 * makes the UI hide them instead of quoting something imaginary.
 */
async function seedConfiguredAssets(pool: Pool): Promise<void> {
  const assets: Array<{ symbol: string; mint: string | undefined; decimals: number; sort: number }> = [
    {
      symbol: "USDC",
      mint: process.env.USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      sort: 4,
    },
    { symbol: "SBUXx", mint: process.env.SBUXX_MINT, decimals: 6, sort: 2 },
    { symbol: "BUCKS", mint: process.env.BUCKS_MINT, decimals: 6, sort: 1 },
  ];

  for (const asset of assets) {
    if (!asset.mint) {
      console.log(`skipping ${asset.symbol}: no mint configured`);
      continue;
    }

    const decimals = await readMintDecimals(asset.mint, asset.decimals);

    await pool.query(
      `INSERT INTO supported_assets (symbol, mint, decimals, is_native, sort_order)
       VALUES ($1, $2, $3, false, $4)
       ON CONFLICT (symbol) DO UPDATE
         SET mint = EXCLUDED.mint,
             decimals = EXCLUDED.decimals,
             sort_order = EXCLUDED.sort_order,
             updated_at = now()`,
      [asset.symbol, asset.mint, decimals, asset.sort],
    );
    console.log(`seeded ${asset.symbol} (${asset.mint}, ${decimals} decimals)`);
  }
}

/** Reads real decimals off the chain so a misconfigured value cannot mis-price a swap. */
async function readMintDecimals(mint: string, fallback: number): Promise<number> {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) return fallback;

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [mint, { encoding: "jsonParsed" }],
      }),
    });
    const json = (await response.json()) as {
      result?: { value?: { data?: { parsed?: { info?: { decimals?: number } } } } };
    };
    const decimals = json.result?.value?.data?.parsed?.info?.decimals;
    if (typeof decimals === "number") return decimals;
    console.warn(`could not read decimals for ${mint}; using ${fallback}`);
    return fallback;
  } catch (error) {
    console.warn(`decimals lookup failed for ${mint}: ${String(error)}`);
    return fallback;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
