import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { env } from "@/lib/env";

/**
 * One pool per process. Serverless functions reuse it across warm invocations
 * via a global, which keeps Supabase connection counts sane.
 */
const globalForDb = globalThis as unknown as { bucksPool?: Pool };

function createPool(): Pool {
  const { DATABASE_URL } = env();
  const needsTls = !/localhost|127\.0\.0\.1/.test(DATABASE_URL);

  return new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Supabase's pooler presents a certificate chain Node does not ship a root
    // for; the connection is still encrypted.
    ssl: needsTls ? { rejectUnauthorized: false } : undefined,
  });
}

export function pool(): Pool {
  globalForDb.bucksPool ??= createPool();
  return globalForDb.bucksPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  const result = await pool().query<T>(text, values as unknown[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

/**
 * Runs `fn` inside a transaction. Used wherever a race would be a real bug:
 * claiming a gift, consuming a quote, recording a payment.
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
