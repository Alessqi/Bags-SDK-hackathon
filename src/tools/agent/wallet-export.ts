/** bags_agent_wallet_export — Export an agent wallet's public key and a redacted private key hint. */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { bagsPost } from "../../client/bags-rest.js";
import { mcpError } from "../../utils/errors.js";

const VISIBLE_PREFIX_LENGTH = 4;
const VISIBLE_SUFFIX_LENGTH = 4;

const inputSchema = {
  token: z.string().describe("JWT from bags_agent_auth_login"),
  walletAddress: z.string().describe("Base58 Solana public key from bags_agent_wallet_list"),
  confirm: z.literal("I_UNDERSTAND_THIS_EXPORTS_A_PRIVATE_KEY")
    .describe("Safety confirmation — must be the exact string 'I_UNDERSTAND_THIS_EXPORTS_A_PRIVATE_KEY'"),
};

/**
 * Redact a private key, showing only the first and last few characters.
 * @param key - The full private key string.
 * @returns A redacted version like "abcd...wxyz".
 */
function redactKey(key: string): string {
  if (key.length <= VISIBLE_PREFIX_LENGTH + VISIBLE_SUFFIX_LENGTH) return "****";
  const prefix = key.slice(0, VISIBLE_PREFIX_LENGTH);
  const suffix = key.slice(-VISIBLE_SUFFIX_LENGTH);
  return `${prefix}...[REDACTED]...${suffix}`;
}

/**
 * Register the bags_agent_wallet_export tool on the given MCP server.
 * Returns a redacted private key hint — never the full key in MCP responses.
 * @param server - The McpServer instance to register on.
 */
export function registerAgentWalletExport(server: McpServer) {
  server.tool(
    "bags_agent_wallet_export",
    "Export an agent wallet's public key info. The private key is redacted in the response for security — use the Bags.fm dashboard or the REST API directly to retrieve the full key in a secure context.",
    inputSchema,
    async ({ token, walletAddress }) => {
      try {
        const result = await bagsPost<{ privateKey: string }>("/agent/wallet/export", {
          token,
          walletAddress,
        });

        if (!result.success) {
          return mcpError(new Error(result.error ?? "Failed to export agent wallet"));
        }

        const fullKey = result.response!.privateKey;

        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            walletAddress,
            privateKeyHint: redactKey(fullKey),
            keyLength: fullKey.length,
            warning: "Private key redacted for security. MCP responses may be logged by clients. Use the Bags.fm dashboard or call the REST API directly in a secure terminal to retrieve the full key.",
          }, null, 2) }],
        };
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
