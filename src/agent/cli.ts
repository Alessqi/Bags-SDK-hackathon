/** CLI entry for agent mode: parses flags and starts the appropriate strategies. */

import type { AgentConfig } from "./types.js";
import { autoClaimLoop, defaultAutoClaimConfig } from "./strategies/auto-claim.js";
import { launchMonitorLoop, defaultMonitorConfig } from "./strategies/launch-monitor.js";
import { scoutLoop, defaultScoutConfig } from "./strategies/scout.js";
import { analyzeFeeOptimization } from "./strategies/fee-optimizer.js";
import { analyzePortfolioRebalance } from "./strategies/portfolio-rebalance.js";

const WALLET_ENV = "AGENT_WALLET_PUBKEY";
const ANTHROPIC_ENV = "ANTHROPIC_API_KEY";

/**
 * Require an env var or exit with a clear message.
 * @param name - Environment variable name.
 * @returns The variable's value.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[agent] ${name} is required for this strategy. Set it in .env or environment.`);
    process.exit(1);
  }
  return value;
}

/**
 * Start the agent with the configured strategies.
 * Loop strategies run concurrently; one-shot strategies run and exit.
 * @param config - Agent configuration from CLI flags.
 */
export async function startAgent(config: AgentConfig): Promise<void> {
  if (config.strategies.includes("fee-optimize")) {
    const wallet = requireEnv(WALLET_ENV);
    requireEnv(ANTHROPIC_ENV);
    console.error("[agent] Running fee optimization analysis...");
    const result = await analyzeFeeOptimization(wallet);
    console.log(result);
    return;
  }

  if (config.strategies.includes("rebalance")) {
    const wallet = requireEnv(WALLET_ENV);
    requireEnv(ANTHROPIC_ENV);
    console.error("[agent] Running portfolio rebalance analysis...");
    const result = await analyzePortfolioRebalance(wallet);
    console.log(result);
    return;
  }

  console.error("[agent] Starting BagsSDK autonomous agent...");
  const promises: Promise<void>[] = [];

  if (config.strategies.includes("auto-claim")) {
    console.error("[agent] Enabling auto-claim strategy");
    const claimConfig = defaultAutoClaimConfig();
    promises.push(autoClaimLoop(claimConfig));
  }

  if (config.strategies.includes("monitor")) {
    console.error("[agent] Enabling launch monitor strategy");
    const monitorConfig = defaultMonitorConfig();
    promises.push(launchMonitorLoop(monitorConfig));
  }

  if (config.strategies.includes("scout")) {
    console.error("[agent] Enabling scout strategy");
    const scoutConfig = defaultScoutConfig();
    promises.push(scoutLoop(scoutConfig));
  }

  if (promises.length === 0) {
    console.error("[agent] No strategies enabled. Use --auto-claim, --monitor, --scout, --fee-optimize, or --rebalance.");
    console.error("[agent] Example: bags-sdk-mcp --agent --scout --auto-claim --monitor");
    return;
  }

  await Promise.all(promises);
}
