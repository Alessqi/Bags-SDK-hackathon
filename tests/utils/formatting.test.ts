/** Unit tests for lamport conversion, address truncation, and time formatting. */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  lamportsToSol,
  solToLamports,
  bpsToPercent,
  truncateAddress,
  relativeTime,
} from "../../src/utils/formatting.js";

describe("lamportsToSol", () => {
  it("converts 0 lamports to '0'", () => {
    expect(lamportsToSol(0)).toBe("0");
  });

  it("converts 1 SOL worth of lamports", () => {
    expect(lamportsToSol(1_000_000_000)).toBe("1");
  });

  it("converts 0.5 SOL", () => {
    expect(lamportsToSol(500_000_000)).toBe("0.5");
  });

  it("converts 1 lamport to smallest SOL fraction", () => {
    expect(lamportsToSol(1)).toBe("0.000000001");
  });

  it("handles large values (100 SOL)", () => {
    expect(lamportsToSol(100_000_000_000)).toBe("100");
  });

  it("accepts string input", () => {
    expect(lamportsToSol("1000000000")).toBe("1");
  });

  it("accepts bigint input", () => {
    expect(lamportsToSol(BigInt(1_000_000_000))).toBe("1");
  });
});

describe("solToLamports", () => {
  it("converts 0.1 SOL to 100_000_000 lamports", () => {
    expect(solToLamports("0.1")).toBe(100_000_000);
  });

  it("converts 1 SOL to 1_000_000_000 lamports", () => {
    expect(solToLamports("1")).toBe(1_000_000_000);
  });

  it("converts 0 SOL to 0 lamports", () => {
    expect(solToLamports(0)).toBe(0);
  });

  it("accepts number input", () => {
    expect(solToLamports(0.5)).toBe(500_000_000);
  });
});

describe("bpsToPercent", () => {
  it("converts 10000 BPS to 100%", () => {
    expect(bpsToPercent(10000)).toBe("100%");
  });

  it("converts 5000 BPS to 50%", () => {
    expect(bpsToPercent(5000)).toBe("50%");
  });

  it("converts 2500 BPS to 25%", () => {
    expect(bpsToPercent(2500)).toBe("25%");
  });

  it("converts 1 BPS to 0.01%", () => {
    expect(bpsToPercent(1)).toBe("0.01%");
  });
});

describe("truncateAddress", () => {
  it("passes through short strings unchanged", () => {
    expect(truncateAddress("short")).toBe("short");
  });

  it("truncates a 44-char address to first6...last4", () => {
    const addr = "AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcd1234";
    expect(truncateAddress(addr)).toBe("AbCdEf...1234");
  });

  it("passes through 12-char strings unchanged", () => {
    expect(truncateAddress("123456789012")).toBe("123456789012");
  });
});

describe("relativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats seconds ago", () => {
    vi.useFakeTimers({ now: 60_000_000 });
    const thirtySecsAgo = Math.floor(Date.now() / 1000) - 30;
    expect(relativeTime(thirtySecsAgo)).toBe("30s ago");
  });

  it("formats minutes ago", () => {
    vi.useFakeTimers({ now: 60_000_000 });
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
    expect(relativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("formats hours ago", () => {
    vi.useFakeTimers({ now: 60_000_000 });
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    expect(relativeTime(twoHoursAgo)).toBe("2h ago");
  });

  it("formats days ago", () => {
    vi.useFakeTimers({ now: 600_000_000 });
    const threeDaysAgo = Math.floor(Date.now() / 1000) - 259200;
    expect(relativeTime(threeDaysAgo)).toBe("3d ago");
  });
});
