/** Builds fee config and launch transactions via Bags API for two-phase signing. */

import { bagsPost } from "../client/bags-rest.js";
import { validateBpsArray, needsLookupTables, findDuplicateWallets } from "../composer/validator.js";
import type { CreateFeeShareConfigResponse } from "../client/types.js";

/** Result from building fee config transactions. */
export interface FeeConfigResult {
  meteoraConfigKey: string;
  transactions: string[];
}

/** Result from building the launch transaction. */
export interface LaunchTxResult {
  transaction: string;
}

/**
 * Build fee config transactions for a wallet via the Bags API.
 * @param wallet - The payer wallet address from the signing page.
 * @param baseMint - Token mint address.
 * @param claimersArray - Resolved wallet addresses for fee claimers.
 * @param basisPointsArray - BPS allocations summing to 10000.
 * @returns Fee config transactions and the meteoraConfigKey.
 */
export async function buildFeeConfigTxs(
  wallet: string,
  baseMint: string,
  claimersArray: string[],
  basisPointsArray: number[],
): Promise<FeeConfigResult> {
  const bpsCheck = validateBpsArray(basisPointsArray);
  if (!bpsCheck.valid) {
    throw new Error(`Invalid fee config: ${bpsCheck.errors.join(", ")}`);
  }

  const dupes = findDuplicateWallets(claimersArray);
  if (dupes.length > 0) {
    throw new Error(`Duplicate wallet addresses: ${dupes.join(", ")}`);
  }

  const body: Record<string, unknown> = {
    payer: wallet,
    baseMint,
    claimersArray,
    basisPointsArray,
  };

  if (needsLookupTables(claimersArray.length)) {
    body.additionalLookupTables = [];
  }

  const result = await bagsPost<CreateFeeShareConfigResponse>("/fee-share/config", body);

  console.error("[launch-builder] fee config raw result:", JSON.stringify(result).slice(0, 500));

  if (!result.success) {
    throw new Error(result.error ?? "Failed to create fee config");
  }

  const resp = result.response;
  if (!resp) {
    throw new Error("Empty response from fee config API");
  }

  const txList = resp.transactions ?? [];
  const extracted = Array.isArray(txList)
    ? txList.map((t) => (typeof t === "string" ? t : t?.transaction)).filter(Boolean)
    : [];

  return {
    meteoraConfigKey: resp.meteoraConfigKey,
    transactions: extracted as string[],
  };
}

/**
 * Build the launch transaction for a wallet via the Bags API.
 * @param wallet - The payer wallet address.
 * @param ipfs - IPFS URI from token info creation.
 * @param tokenMint - Token mint address.
 * @param configKey - meteoraConfigKey from fee config.
 * @param initialBuyLamports - Initial buy amount in lamports.
 * @returns The unsigned launch transaction.
 */
export async function buildLaunchTx(
  wallet: string,
  ipfs: string,
  tokenMint: string,
  configKey: string,
  initialBuyLamports: number,
): Promise<LaunchTxResult> {
  const result = await bagsPost<Record<string, unknown>>(
    "/token-launch/create-launch-transaction",
    { ipfs, tokenMint, wallet, initialBuyLamports, configKey },
  );

  console.error("[launch-builder] launch tx raw result:", JSON.stringify(result).slice(0, 500));

  if (!result.success) {
    throw new Error(result.error ?? "Failed to create launch transaction");
  }

  const raw = result.response;
  if (!raw) {
    throw new Error("Empty response from launch transaction API");
  }

  const tx = typeof raw === "string"
    ? raw
    : (raw as Record<string, unknown>).transaction as string;

  if (!tx) {
    throw new Error("No transaction found in launch response");
  }

  return { transaction: tx };
}
