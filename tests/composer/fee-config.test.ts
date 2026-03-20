/** Unit tests for the FeeConfigBuilder fluent API and presets. */

import { describe, it, expect } from "vitest";
import { FeeConfigBuilder } from "../../src/composer/fee-config.js";

describe("FeeConfigBuilder.soloCreator", () => {
  it("produces 1 recipient at 10000 BPS", () => {
    const builder = FeeConfigBuilder.soloCreator("twitter", "alice");
    const recipients = builder.getRecipients();
    expect(recipients).toHaveLength(1);
    expect(recipients[0].bps).toBe(10000);
  });

  it("validates successfully", () => {
    const result = FeeConfigBuilder.soloCreator("twitter", "alice").validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("FeeConfigBuilder.creatorPlusDividends", () => {
  it("default 50/50 validates", () => {
    const builder = FeeConfigBuilder.creatorPlusDividends("twitter", "bob");
    const recipients = builder.getRecipients();
    expect(recipients).toHaveLength(2);
    expect(recipients[0].bps).toBe(5000);
    expect(recipients[1].bps).toBe(5000);
    expect(builder.validate().valid).toBe(true);
  });

  it("custom split validates", () => {
    const builder = FeeConfigBuilder.creatorPlusDividends("twitter", "bob", 7000);
    const recipients = builder.getRecipients();
    expect(recipients[0].bps).toBe(7000);
    expect(recipients[1].bps).toBe(3000);
    expect(builder.validate().valid).toBe(true);
  });
});

describe("FeeConfigBuilder.teamSplit", () => {
  it("3 members sum to 10000 with round-robin remainder", () => {
    const builder = FeeConfigBuilder.teamSplit([
      { provider: "twitter", username: "a" },
      { provider: "twitter", username: "b" },
      { provider: "twitter", username: "c" },
    ]);
    const recipients = builder.getRecipients();
    const total = recipients.reduce((sum, r) => sum + r.bps, 0);
    expect(total).toBe(10000);
    expect(recipients[0].bps).toBe(3334);
    expect(recipients[1].bps).toBe(3333);
    expect(recipients[2].bps).toBe(3333);
    expect(builder.validate().valid).toBe(true);
  });
});

describe("splitEvenly", () => {
  it("4 members get 2500 each", () => {
    const builder = FeeConfigBuilder.create().splitEvenly([
      { provider: "twitter", username: "w" },
      { provider: "twitter", username: "x" },
      { provider: "twitter", username: "y" },
      { provider: "twitter", username: "z" },
    ]);
    const recipients = builder.getRecipients();
    for (const r of recipients) {
      expect(r.bps).toBe(2500);
    }
  });
});

describe("validation errors", () => {
  it("rejects empty recipients", () => {
    const result = FeeConfigBuilder.create().validate();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("recipient"))).toBe(true);
  });

  it("rejects BPS not summing to 10000", () => {
    const builder = FeeConfigBuilder.create()
      .addRecipient("twitter", "a", 5000)
      .addRecipient("twitter", "b", 3000);
    const result = builder.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("10000"))).toBe(true);
  });

  it("rejects duplicate provider:username", () => {
    const builder = FeeConfigBuilder.create()
      .addRecipient("twitter", "same", 5000)
      .addRecipient("twitter", "same", 5000);
    const result = builder.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  it("rejects negative BPS", () => {
    const builder = FeeConfigBuilder.create()
      .addRecipient("twitter", "a", -100)
      .addRecipient("twitter", "b", 10100);
    const result = builder.validate();
    expect(result.valid).toBe(false);
  });
});

describe("needsLookupTables", () => {
  it("returns false for 15 recipients", () => {
    const builder = FeeConfigBuilder.create();
    const bpsEach = Math.floor(10000 / 15);
    const remainder = 10000 - bpsEach * 15;
    for (let i = 0; i < 15; i++) {
      builder.addRecipient("twitter", `user${i}`, bpsEach + (i === 0 ? remainder : 0));
    }
    expect(builder.needsLookupTables()).toBe(false);
  });

  it("returns true for 16 recipients", () => {
    const builder = FeeConfigBuilder.create();
    const bpsEach = Math.floor(10000 / 16);
    const remainder = 10000 - bpsEach * 16;
    for (let i = 0; i < 16; i++) {
      builder.addRecipient("twitter", `user${i}`, bpsEach + (i === 0 ? remainder : 0));
    }
    expect(builder.needsLookupTables()).toBe(true);
  });
});
