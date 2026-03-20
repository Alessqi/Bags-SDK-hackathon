/** Unit tests for the tiered TTL cache. */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cache } from "../../src/client/cache.js";

describe("ApiCache", () => {
  beforeEach(() => {
    cache.invalidate("");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cached data within TTL", () => {
    cache.set("test:key", { value: 42 }, 60_000);
    expect(cache.get("test:key")).toEqual({ value: 42 });
  });

  it("returns null after TTL expires", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    cache.set("test:expired", "data", 100);
    vi.advanceTimersByTime(200);
    expect(cache.get("test:expired")).toBeNull();
  });

  it("never stores when TTL is 0", () => {
    cache.set("test:none", "data", 0);
    expect(cache.get("test:none")).toBeNull();
    expect(cache.size).toBe(0);
  });

  it("never expires when TTL is Infinity", () => {
    vi.useFakeTimers({ now: 1_000_000 });
    cache.set("test:forever", "permanent", Infinity);
    vi.advanceTimersByTime(999_999_999);
    expect(cache.get("test:forever")).toBe("permanent");
  });

  it("invalidates by prefix", () => {
    cache.set("fee:config1", "a", 60_000);
    cache.set("fee:config2", "b", 60_000);
    cache.set("trade:quote1", "c", 60_000);
    cache.invalidate("fee:");
    expect(cache.get("fee:config1")).toBeNull();
    expect(cache.get("fee:config2")).toBeNull();
    expect(cache.get("trade:quote1")).toBe("c");
  });

  it("tracks size correctly", () => {
    cache.set("a", 1, 60_000);
    cache.set("b", 2, 60_000);
    expect(cache.size).toBe(2);
    cache.invalidate("a");
    expect(cache.size).toBe(1);
  });
});
