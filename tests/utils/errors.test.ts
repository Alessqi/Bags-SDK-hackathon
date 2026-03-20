/** Unit tests for actionable error mapping and MCP error payloads. */

import { describe, it, expect } from "vitest";
import { toActionableMessage, mcpError } from "../../src/utils/errors.js";

describe("toActionableMessage", () => {
  it("maps 401 errors to API key guidance", () => {
    const msg = toActionableMessage(new Error("HTTP 401 Unauthorized"));
    expect(msg).toContain("API");
    expect(msg).toContain("dev.bags.fm");
  });

  it("maps 429 errors to rate limit guidance", () => {
    const msg = toActionableMessage(new Error("HTTP 429 Too Many Requests"));
    expect(msg).toContain("Rate limited");
  });

  it("maps 404 errors to address check guidance", () => {
    const msg = toActionableMessage(new Error("HTTP 404 Not Found"));
    expect(msg).toContain("not found");
    expect(msg).toContain("addresses");
  });

  it("maps ECONNREFUSED to network guidance", () => {
    const msg = toActionableMessage(new Error("connect ECONNREFUSED 127.0.0.1:443"));
    expect(msg).toContain("network");
  });

  it("wraps generic errors with prefix", () => {
    const msg = toActionableMessage(new Error("something broke"));
    expect(msg).toContain("Bags API error");
    expect(msg).toContain("something broke");
  });

  it("handles non-Error values", () => {
    const msg = toActionableMessage("raw string error");
    expect(msg).toContain("raw string error");
  });
});

describe("mcpError", () => {
  it("returns isError: true", () => {
    const result = mcpError(new Error("test"));
    expect(result.isError).toBe(true);
  });

  it("returns content array with text type", () => {
    const result = mcpError(new Error("test"));
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
  });

  it("maps the error through toActionableMessage", () => {
    const result = mcpError(new Error("HTTP 401"));
    expect(result.content[0].text).toContain("API");
  });
});
