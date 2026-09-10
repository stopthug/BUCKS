/**
 * All money in this codebase is an integer in the smallest unit of its asset.
 * USD amounts use 6 decimals so they line up exactly with USDC base units and
 * never touch floating point.
 */

export const USD_DECIMALS = 6;

export class MoneyError extends Error {}

/** Parses a decimal string (`"10.4200"`) into base units for `decimals`. */
export function parseDecimalToBaseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new MoneyError(`Not a decimal number: ${value}`);
  }

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = "0", fraction = ""] = unsigned.split(".");

  if (fraction.length > decimals) {
    // Extra precision is truncated toward zero rather than silently rounded up.
    const truncated = fraction.slice(0, decimals);
    const result = BigInt(whole + truncated.padEnd(decimals, "0"));
    return negative ? -result : result;
  }

  const result = BigInt(whole + fraction.padEnd(decimals, "0"));
  return negative ? -result : result;
}

export function parseUsd(value: string): bigint {
  return parseDecimalToBaseUnits(value, USD_DECIMALS);
}

/** Formats base units back to a decimal string with no trailing-zero padding. */
export function formatBaseUnits(
  amount: bigint,
  decimals: number,
  options: { maxFractionDigits?: number; minFractionDigits?: number } = {},
): string {
  const maxFractionDigits = options.maxFractionDigits ?? decimals;
  const minFractionDigits = options.minFractionDigits ?? 0;

  const negative = amount < 0n;
  const unsigned = negative ? -amount : amount;
  const divisor = 10n ** BigInt(decimals);
  const whole = unsigned / divisor;
  const fraction = unsigned % divisor;

  let fractionText = fraction.toString().padStart(decimals, "0").slice(0, maxFractionDigits);
  fractionText = fractionText.replace(/0+$/, "");
  while (fractionText.length < minFractionDigits) {
    fractionText += "0";
  }

  const wholeText = whole.toLocaleString("en-US");
  const sign = negative ? "-" : "";
  return fractionText ? `${sign}${wholeText}.${fractionText}` : `${sign}${wholeText}`;
}

export function formatUsd(amount: bigint): string {
  return `$${formatBaseUnits(amount, USD_DECIMALS, {
    minFractionDigits: 2,
    maxFractionDigits: 2,
  })}`;
}

/**
 * Formats a token amount for display: enough significant digits to be useful
 * for both cheap memecoins and expensive assets, without scientific notation.
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (amount === 0n) return "0";
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;

  if (whole >= 1000n) return formatBaseUnits(amount, decimals, { maxFractionDigits: 2 });
  if (whole >= 1n) return formatBaseUnits(amount, decimals, { maxFractionDigits: 4 });
  return formatBaseUnits(amount, decimals, { maxFractionDigits: Math.min(decimals, 6) });
}

/** Multiplies by a basis-point factor, rounding up. Used for slippage buffers. */
export function addBasisPoints(amount: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0) {
    throw new MoneyError(`Invalid basis points: ${bps}`);
  }
  const numerator = amount * BigInt(10_000 + bps);
  return divideCeil(numerator, 10_000n);
}

export function divideCeil(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new MoneyError("Denominator must be positive");
  if (numerator <= 0n) return numerator / denominator;
  return (numerator + denominator - 1n) / denominator;
}

/**
 * Extracts a gift-card face value from a provider offer name. Provider naming
 * is inconsistent (`"Starbucks US $10"`, `"Starbucks 25 USD"`), so this is
 * best-effort: a null result means we display the provider name verbatim
 * rather than inventing a denomination.
 */
export function parseFaceValueUsd(offerName: string): bigint | null {
  const dollarPrefixed = offerName.match(/\$\s*(\d+(?:[.,]\d{1,2})?)/);
  if (dollarPrefixed?.[1]) {
    return parseUsd(dollarPrefixed[1].replace(",", "."));
  }

  const currencySuffixed = offerName.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:usd|dollars?)\b/i);
  if (currencySuffixed?.[1]) {
    return parseUsd(currencySuffixed[1].replace(",", "."));
  }

  return null;
}
