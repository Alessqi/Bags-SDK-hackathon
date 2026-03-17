/** Streamable HTTP transport with security hardening for remote MCP connections. */

import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createServer } from "../index.js";

const DEFAULT_PORT = 3000;
const LOCALHOST = "127.0.0.1";
const RATE_WINDOW_MS = 3_600_000;
const MAX_REQUESTS_PER_WINDOW = 1_000;

/** Per-IP request counters for rate limiting. */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate-limiting middleware — enforces MAX_REQUESTS_PER_WINDOW per IP per hour.
 * Returns 429 with a Retry-After header when the limit is exceeded.
 */
function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    next();
    return;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1_000);
    res.set("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Rate limit exceeded. Try again later." });
    return;
  }

  next();
}

/**
 * Bearer token auth middleware — requires MCP_HTTP_TOKEN env var when set.
 * Skips auth if the env var is not configured (local development).
 */
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const requiredToken = process.env.MCP_HTTP_TOKEN;
  if (!requiredToken) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header. Use: Bearer <MCP_HTTP_TOKEN>" });
    return;
  }

  const provided = header.slice("Bearer ".length);
  if (provided !== requiredToken) {
    res.status(403).json({ error: "Invalid token." });
    return;
  }

  next();
}

/**
 * Start the BagsSDK MCP server over streamable HTTP.
 * Binds to 127.0.0.1 by default. Set MCP_HTTP_HOST=0.0.0.0 to expose on all interfaces.
 * Set MCP_HTTP_TOKEN to require Bearer auth on all requests.
 * @param port - Port to listen on (default 3000, or PORT env var).
 */
export async function startHttp(port?: number): Promise<void> {
  const listenPort = port ?? (Number(process.env.PORT) || DEFAULT_PORT);
  const listenHost = process.env.MCP_HTTP_HOST ?? LOCALHOST;

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  const app = express();

  app.use(cors({ origin: false }));
  app.use(express.json());
  app.use(rateLimiter);

  app.post("/mcp", authMiddleware, async (req, res) => {
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "bags-sdk-mcp" });
  });

  app.listen(listenPort, listenHost, () => {
    console.error(`[bags-sdk-mcp] HTTP server running on ${listenHost}:${listenPort}`);
    console.error(`[bags-sdk-mcp] MCP endpoint: POST http://${listenHost}:${listenPort}/mcp`);
    if (!process.env.MCP_HTTP_TOKEN) {
      console.error("[bags-sdk-mcp] WARNING: No MCP_HTTP_TOKEN set. Requests are unauthenticated.");
    }
  });
}
