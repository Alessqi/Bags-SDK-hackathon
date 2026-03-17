/** Input validation helpers for Solana addresses and common parameters. */

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Check whether a string is a valid Base58-encoded Solana public key.
 * Does not verify the key exists on-chain — only validates format and length.
 * @param address - The candidate address string.
 * @returns True if the address passes format validation.
 */
export function isValidSolanaAddress(address: string): boolean {
  return BASE58_REGEX.test(address);
}

/**
 * Validate a Solana address and throw a clear error if invalid.
 * Call this at the top of any tool handler that accepts a wallet or mint.
 * @param address - The candidate address string.
 * @param label - Human-readable label for the error message (e.g. "walletAddress", "tokenMint").
 * @throws Error with an actionable message if validation fails.
 */
export function requireValidAddress(address: string, label: string): void {
  if (!isValidSolanaAddress(address)) {
    throw new Error(
      `Invalid ${label}: "${address}" is not a valid Base58 Solana address. ` +
      "Solana addresses are 32-44 characters using Base58 encoding (no 0, O, I, or l).",
    );
  }
}
