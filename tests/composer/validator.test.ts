/** Unit tests for standalone fee config validation utilities. */

import { describe, it, expect } from "vitest";
import {
  validateBpsArray,
  findDuplicateWallets,
  needsLookupTables,
} from "../../src/composer/validator.js";

describe("validateBpsArray", () => {
  it("accepts a valid array summing to 10000", () => {
    const result = validateBpsArray([5000, 3000, 2000]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an empty array", () => {
    const result = validateBpsArray([]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
  });

  it("rejects when sum is not 10000", () => {
    const result = validateBpsArray([5000, 4000]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("10000"))).toBe(true);
  });

  it("rejects non-integer values", () => {
    const result = validateBpsArray([5000.5, 4999.5]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("positive integer"))).toBe(true);
  });

  it("rejects zero values", () => {
    const result = validateBpsArray([10000, 0]);
    expect(result.valid).toBe(false);
  });
});

describe("findDuplicateWallets", () => {
  it("returns empty array when no duplicates", () => {
    expect(findDuplicateWallets(["aaa", "bbb", "ccc"])).toEqual([]);
  });

  it("returns duplicate addresses", () => {
    const dupes = findDuplicateWallets(["aaa", "bbb", "aaa"]);
    expect(dupes).toContain("aaa");
  });
});

describe("needsLookupTables", () => {
  it("returns false at threshold (15)", () => {
    expect(needsLookupTables(15)).toBe(false);
  });

  it("returns true above threshold (16)", () => {
    expect(needsLookupTables(16)).toBe(true);
  });

  it("returns false below threshold", () => {
    expect(needsLookupTables(5)).toBe(false);
  });
});
