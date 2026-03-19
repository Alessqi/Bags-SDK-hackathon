/** File-backed session store — shares sessions between the MCP process and the Express server. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const STORE_DIR = resolve(THIS_DIR, "../../.sessions");
const STORE_PATH = resolve(STORE_DIR, "sessions.json");
const SESSION_TTL_MS = 600_000;

/* eslint-disable @typescript-eslint/no-explicit-any */
type StoreData = Record<string, any>;

/**
 * Read the full store from disk. Returns empty object if file missing or corrupt.
 */
function readStore(): StoreData {
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw) as StoreData;
  } catch {
    return {};
  }
}

/**
 * Write the full store to disk.
 * @param data - The session map to persist.
 */
function writeStore(data: StoreData): void {
  mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data), "utf-8");
}

/**
 * Get a session by ID, pruning expired entries first.
 * @param id - Session UUID.
 * @returns The session object or undefined if not found/expired.
 */
export function getSession<T>(id: string): T | undefined {
  const store = readStore();
  pruneExpiredEntries(store);
  return store[id] as T | undefined;
}

/**
 * Save or update a session by ID.
 * @param id - Session UUID.
 * @param session - The session data to persist.
 */
export function setSession(id: string, session: any): void {
  const store = readStore();
  pruneExpiredEntries(store);
  store[id] = session;
  writeStore(store);
}

/**
 * Delete a session by ID.
 * @param id - Session UUID.
 */
export function deleteSession(id: string): void {
  const store = readStore();
  delete store[id];
  writeStore(store);
}

/**
 * Remove expired sessions from a store object (mutates in place, writes to disk).
 * @param store - The store data to prune.
 */
function pruneExpiredEntries(store: StoreData): void {
  const now = Date.now();
  let changed = false;
  for (const [id, session] of Object.entries(store)) {
    if (now - (session?.createdAt ?? 0) > SESSION_TTL_MS) {
      delete store[id];
      changed = true;
    }
  }
  if (changed) {
    writeStore(store);
  }
}
