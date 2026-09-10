import "server-only";

import { Connection } from "@solana/web3.js";

import { env } from "@/lib/env";

const globalForRpc = globalThis as unknown as { bucksConnection?: Connection };

export function connection(): Connection {
  globalForRpc.bucksConnection ??= new Connection(env().SOLANA_RPC_URL, {
    commitment: "confirmed",
    disableRetryOnRateLimit: false,
  });
  return globalForRpc.bucksConnection;
}
