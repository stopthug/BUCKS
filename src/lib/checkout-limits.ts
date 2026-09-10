/**
 * Shared between the client form and the server validator, so the character
 * counter in the UI and the rule that actually rejects input cannot drift.
 */
export const GIFT_MESSAGE_MAX_LENGTH = 120;
export const GIFT_NAME_MAX_LENGTH = 40;
export const RECEIPT_EMAIL_MAX_LENGTH = 254;

/** Assets the wallet-free checkout accepts. $BUCKS is not part of this flow. */
export const CHECKOUT_ASSETS = ["USDC", "SOL", "SBUXx"] as const;
export type CheckoutAsset = (typeof CHECKOUT_ASSETS)[number];
