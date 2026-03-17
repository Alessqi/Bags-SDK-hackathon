/** MCP Prompt: Guided team token launch with multi-party fee splits. */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const argsSchema = {
  tokenName: z.string().describe("Token name (max 32 chars)"),
  tokenSymbol: z.string().describe("Token symbol (max 10 chars)"),
  tokenDescription: z.string().describe("Token description (max 1000 chars)"),
  imageUrl: z.string().optional().describe("Public URL for token image, or a text description to generate one"),
  teamMembers: z.string().describe("Comma-separated 'platform:username:percentage' (e.g., 'twitter:alice:30,twitter:bob:20,twitter:DividendsBot:10'). Must sum to 100."),
  initialBuySol: z.string().default("0").describe("Initial buy amount in SOL"),
};

/**
 * Register the bags_launch_team_token prompt on the given MCP server.
 * @param server - The McpServer instance to register on.
 */
export function registerLaunchTeamTokenPrompt(server: McpServer) {
  server.prompt(
    "bags_launch_team_token",
    "Guided workflow: launch a token with multi-party fee splits.",
    argsSchema,
    ({ tokenName, tokenSymbol, tokenDescription, imageUrl, teamMembers, initialBuySol }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `The user wants to launch a team token on Bags.fm. Here are the details:

  Name: ${tokenName}
  Symbol: $${tokenSymbol}
  Description: ${tokenDescription}
  Image: ${imageUrl || "(not provided yet)"}
  Team: ${teamMembers}
  Initial buy: ${initialBuySol} SOL

**Image handling:**
- If the image field is a URL (starts with http), use it directly.
- If it is a text description or empty, offer to generate an image. Use image generation tools if available, show the result, and iterate until the user is happy. Only proceed once they approve the image.

Show them this summary in a clean format, including a breakdown of who gets what %.
Ask: "Does this look right?"

If they confirm, this is a single-page process. Do NOT narrate tool names.

STEPS (silent):
  1. Parse team members. For each, if it is a social handle, resolve via bags_resolve_wallet. If already a Solana address, use directly. Collect resolved wallet addresses and their BPS allocations.
  2. bags_create_token_info with the token details. Save both tokenMint and uri from the response.
  3. bags_open_launch_page with:
     - tokenMint and uri from step 2
     - claimersArray: resolved wallet addresses from step 1
     - basisPointsArray: BPS values from step 1 (convert percentages to basis points internally — never show BPS to the user)
     - initialBuySol: ${initialBuySol}
     - description: "Launch $${tokenSymbol} (team token)"
     - meta: { Name: "${tokenName}", Symbol: "$${tokenSymbol}", Team: "${teamMembers}", "Initial Buy": "${initialBuySol} SOL" }

  Tell the user: "Click this link to launch your token. You'll connect your wallet and sign two quick transactions — fee setup and launch."

  NOTE: The user's wallet address comes from the signing page when they connect — you do NOT need to ask for it. The wallet that connects will be the transaction payer.

If any step fails, explain the error in plain language — no tool names, no jargon.`,
        },
      }],
    }),
  );
}
