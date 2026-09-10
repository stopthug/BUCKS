"use client";

import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import {
  SolanaSignMessage,
  SolanaSignTransaction,
  type SolanaSignMessageFeature,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Wallet Standard integration.
 *
 * Wallets announce themselves through the Wallet Standard registry, so there
 * is no adapter list to maintain and no wallet-specific code here. We require
 * three features: connect, sign-message (for login) and sign-transaction.
 *
 * Sign-transaction rather than sign-and-send is deliberate. The signed bytes
 * come back to our server, which lands them and then verifies settlement
 * onchain before a card is ever issued. A wallet that only broadcasts on its
 * own would leave us trusting the client's word for it.
 *
 * The app never asks for a private key or a seed phrase, and nothing in this
 * file could transmit one if it did.
 */

const SOLANA_MAINNET = "solana:mainnet";

export interface DetectedWallet {
  name: string;
  icon: string | undefined;
  wallet: Wallet;
}

export type WalletStatus =
  | "disconnected"
  | "connecting"
  | "signing-in"
  | "connected"
  | "unsupported";

interface WalletContextValue {
  wallets: DetectedWallet[];
  status: WalletStatus;
  address: string | null;
  walletName: string | null;
  error: string | null;
  /**
   * Opens the wallet. Pass `{ authenticate: true }` on the account page so we
   * get a signed login. Checkout only needs the address — payment is the proof.
   */
  connect: (wallet: Wallet, options?: { authenticate?: boolean }) => Promise<string | null>;
  disconnect: () => Promise<void>;
  /** True only when the in-page wallet can actually sign a transaction. */
  canSign: boolean;
  /** Signs a base64 transaction and returns the signed bytes as base64. */
  signTransaction: (base64Transaction: string) => Promise<string>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function supportsSolana(wallet: Wallet): boolean {
  const hasChain = wallet.chains.some((chain) => chain.startsWith("solana:"));
  const features = wallet.features as Record<string, unknown>;
  return (
    hasChain &&
    "standard:connect" in features &&
    SolanaSignMessage in features &&
    SolanaSignTransaction in features
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Registry subscription. Wallets can register after page load, so this
  // listens rather than reading once.
  useEffect(() => {
    const registry = getWallets();

    const sync = () => {
      setWallets(
        registry
          .get()
          .filter(supportsSolana)
          .map((entry) => ({ name: entry.name, icon: entry.icon, wallet: entry })),
      );
    };

    sync();
    const unsubscribeRegister = registry.on("register", sync);
    const unsubscribeUnregister = registry.on("unregister", sync);

    return () => {
      unsubscribeRegister();
      unsubscribeUnregister();
    };
  }, []);

  // Restore an existing server session so a returning visitor is not asked to
  // sign again on every page load.
  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/session", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { authenticated?: boolean; address?: string } | null) => {
        if (cancelled || !data?.authenticated || !data.address) return;
        setAddress(data.address);
        setStatus("connected");
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(
    async (target: Wallet, options?: { authenticate?: boolean }): Promise<string | null> => {
      setError(null);

      if (!supportsSolana(target)) {
        setStatus("unsupported");
        setError("that wallet cannot sign Solana transactions for this site.");
        return null;
      }

      setStatus("connecting");

      try {
        const features = target.features as Record<string, unknown>;
        const connectFeature = features["standard:connect"] as {
          connect: () => Promise<{ accounts: readonly WalletAccount[] }>;
        };

        const { accounts } = await connectFeature.connect();
        const solanaAccount =
          accounts.find((entry) => entry.chains.includes(SOLANA_MAINNET)) ?? accounts[0];

        if (!solanaAccount) {
          setStatus("disconnected");
          setError("no account was shared by that wallet.");
          return null;
        }

        if (options?.authenticate) {
          setStatus("signing-in");
          await signIn(target, solanaAccount);
        }

        setWallet(target);
        setAccount(solanaAccount);
        setAddress(solanaAccount.address);
        setStatus("connected");
        return solanaAccount.address;
      } catch (cause) {
        setStatus("disconnected");
        setError(describe(cause));
        return null;
      }
    },
    [],
  );

  const disconnect = useCallback(async () => {
    const features = (wallet?.features ?? {}) as Record<string, unknown>;
    const disconnectFeature = features["standard:disconnect"] as
      | { disconnect: () => Promise<void> }
      | undefined;

    await disconnectFeature?.disconnect().catch(() => undefined);
    await fetch("/api/auth/session", { method: "DELETE", credentials: "same-origin" }).catch(
      () => undefined,
    );

    setWallet(null);
    setAccount(null);
    setAddress(null);
    setStatus("disconnected");
  }, [wallet]);

  const signTransaction = useCallback(
    async (base64Transaction: string): Promise<string> => {
      if (!wallet || !account) {
        throw new Error("open your wallet to pay.");
      }

      const feature = (wallet.features as unknown as SolanaSignTransactionFeature)[
        SolanaSignTransaction
      ];

      const [output] = await feature.signTransaction({
        account,
        transaction: base64ToBytes(base64Transaction),
        chain: SOLANA_MAINNET,
      });

      if (!output) throw new Error("the wallet returned no signed transaction.");

      return bytesToBase64(output.signedTransaction);
    },
    [wallet, account],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      status,
      address,
      walletName: wallet?.name ?? null,
      error,
      connect,
      disconnect,
      signTransaction,
      canSign: Boolean(wallet && account),
      clearError: () => setError(null),
    }),
    [wallets, status, address, wallet, account, error, connect, disconnect, signTransaction],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
}

/**
 * Nonce challenge, wallet signature, server verification. The message is
 * issued by the server and shown to the user verbatim; it authorises nothing
 * beyond proving wallet ownership.
 */
async function signIn(wallet: Wallet, account: WalletAccount): Promise<void> {
  const nonceResponse = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ address: account.address }),
  });

  if (!nonceResponse.ok) throw await toError(nonceResponse);

  const challenge = (await nonceResponse.json()) as { nonce: string; message: string };

  const feature = (wallet.features as unknown as SolanaSignMessageFeature)[SolanaSignMessage];
  const [signed] = await feature.signMessage({
    account,
    message: new TextEncoder().encode(challenge.message),
  });

  if (!signed) throw new Error("the wallet did not return a signature.");

  const verifyResponse = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      address: account.address,
      nonce: challenge.nonce,
      signature: bytesToBase64(signed.signature),
    }),
  });

  if (!verifyResponse.ok) throw await toError(verifyResponse);
}

async function toError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return new Error(body?.message ?? "something went wrong. try again.");
}

function describe(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);

  // Wallets word rejection differently; all of them mean the same thing.
  if (/reject|denied|cancel|declin/i.test(message)) {
    return "you cancelled that. nothing was charged.";
  }

  return message.toLowerCase();
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
