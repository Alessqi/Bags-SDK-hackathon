/** Unit tests for Solana address validation helpers. */

import { describe, it, expect } from "vitest";
import {
  isValidSolanaAddress,
  requireValidAddress,
} from "../../src/utils/validation.js";

describe("isValidSolanaAddress", () => {
  it("accepts a valid 44-char base58 address", () => {
    expect(isValidSolanaAddress("83xQKBYR4eN8pQCKQL1ZPqDmNb8zKSwuvNTPNU6ofbiH")).toBe(true);
  });

  it("accepts a valid 32-char base58 address", () => {
    expect(isValidSolanaAddress("11111111111111111111111111111111")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidSolanaAddress("")).toBe(false);
  });

  it("rejects addresses with invalid char 0", () => {
    expect(isValidSolanaAddress("0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBe(false);
  });

  it("rejects addresses with invalid char O", () => {
    expect(isValidSolanaAddress("Oxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBe(false);
  });

  it("rejects addresses with invalid char I", () => {
    expect(isValidSolanaAddress("Ixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBe(false);
  });

  it("rejects addresses with invalid char l", () => {
    expect(isValidSolanaAddress("lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBe(false);
  });

  it("rejects too-short strings", () => {
    expect(isValidSolanaAddress("abc")).toBe(false);
  });

  it("rejects too-long strings (45 chars)", () => {
    const tooLong = "A".repeat(45);
    expect(isValidSolanaAddress(tooLong)).toBe(false);
  });
});

describe("requireValidAddress", () => {
  it("does not throw for a valid address", () => {
    expect(() =>
      requireValidAddress("83xQKBYR4eN8pQCKQL1ZPqDmNb8zKSwuvNTPNU6ofbiH", "wallet"),
    ).not.toThrow();
  });

  it("throws with the label in the message for invalid addresses", () => {
    expect(() => requireValidAddress("bad", "tokenMint")).toThrow("tokenMint");
  });

  it("includes guidance about Base58 in the error", () => {
    expect(() => requireValidAddress("nope", "wallet")).toThrow("Base58");
  });
});
