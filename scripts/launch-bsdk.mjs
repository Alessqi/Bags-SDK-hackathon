/** Script to launch the BSDK token via the Bags SDK and REST API. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import FormData from "form-data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually since dotenv may not be installed
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const API_BASE = process.env.BAGS_API_BASE || "https://public-api-v2.bags.fm/api/v1";
const API_KEY = process.env.BAGS_API_KEY;
const LAMPORTS_PER_SOL = 1_000_000_000;

const WALLET = "83xQKBYR4eN8pQCKQL1ZPqDmNb8zKSwuvNTPNU6ofbiH";
const INITIAL_BUY_SOL = 0.1;
const INITIAL_BUY_LAMPORTS = Math.round(INITIAL_BUY_SOL * LAMPORTS_PER_SOL);

if (!API_KEY) {
  console.error("ERROR: BAGS_API_KEY not set in .env");
  process.exit(1);
}

/**
 * POST JSON to the Bags API.
 * @param {string} endpoint - API path.
 * @param {object} body - JSON body.
 * @returns {Promise<object>} Parsed response.
 */
async function bagsPostJson(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response at ${endpoint} (HTTP ${res.status}): ${text.substring(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} at ${endpoint}: ${JSON.stringify(json)}`);
  }
  return json;
}

/**
 * POST multipart form data to the Bags API (for image upload).
 * @param {string} endpoint - API path.
 * @param {FormData} formData - Form data with image and metadata.
 * @returns {Promise<object>} Parsed response.
 */
async function bagsPostForm(endpoint, formData) {
  const url = `${API_BASE}${endpoint}`;
  return new Promise((resolve, reject) => {
    formData.submit(
      {
        protocol: "https:",
        hostname: "public-api-v2.bags.fm",
        path: `/api/v1${endpoint}`,
        method: "POST",
        headers: { "x-api-key": API_KEY },
      },
      (err, res) => {
        if (err) return reject(err);
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode} at ${endpoint}: ${JSON.stringify(json)}`));
            } else {
              resolve(json);
            }
          } catch {
            reject(new Error(`Non-JSON at ${endpoint} (HTTP ${res.statusCode}): ${body.substring(0, 300)}`));
          }
        });
      },
    );
  });
}

async function main() {
  console.log("=== BSDK Token Launch ===\n");

  // Step 1: Create token info with local image via multipart form
  const logoPath = path.join(__dirname, "..", "assets", "logo.png");
  console.log("1. Creating token metadata + uploading logo to IPFS...");

  const form = new FormData();
  form.append("image", fs.createReadStream(logoPath), { filename: "logo.png", contentType: "image/png" });
  form.append("name", "Bags SDK");
  form.append("symbol", "BSDK");
  form.append("description", "This is the coin to demonstrate how easy it is to launch and manage a coin using Bags SDK!");

  const infoResult = await bagsPostForm("/token-launch/create-token-info", form);
  const tokenMint = infoResult.tokenMint;
  const uri = infoResult.tokenLaunch.uri;
  console.log("   Token Mint:", tokenMint);
  console.log("   Metadata URI:", uri);
  console.log("   Image:", infoResult.tokenLaunch.image);

  // Step 2: Create fee config (100% to creator)
  console.log("\n2. Creating fee config (100% to creator)...");
  const configResult = await bagsPostJson("/fee-share/config", {
    payer: WALLET,
    baseMint: tokenMint,
    claimersArray: [WALLET],
    basisPointsArray: [10000],
  });

  const configKey = configResult.meteoraConfigKey;
  const feeConfigTxs = configResult.transactions || [];
  console.log("   Config Key:", configKey);
  console.log("   Needs creation:", configResult.needsCreation);
  console.log("   Fee config transactions:", feeConfigTxs.length);

  // Step 3: Build launch transaction
  console.log("\n3. Building launch transaction...");
  const launchTx = await bagsPostJson("/token-launch/create-launch-transaction", {
    ipfs: uri,
    tokenMint,
    wallet: WALLET,
    initialBuyLamports: INITIAL_BUY_LAMPORTS,
    configKey,
  });

  // Output summary
  console.log("\n=== LAUNCH READY ===\n");
  console.log("Token Mint:    ", tokenMint);
  console.log("Symbol:         BSDK");
  console.log("Name:           Bags SDK");
  console.log("Config Key:    ", configKey);
  console.log("Initial Buy:    0.1 SOL");
  console.log("Fee Split:      100% to", WALLET);
  console.log("\nTransactions to sign (in order):");
  feeConfigTxs.forEach((tx, i) => {
    const txStr = typeof tx === "string" ? tx : tx.transaction;
    console.log(`  ${i + 1}. Fee config tx: ${txStr.substring(0, 40)}...`);
  });
  const launchTxStr = typeof launchTx === "string" ? launchTx : JSON.stringify(launchTx);
  console.log(`  ${feeConfigTxs.length + 1}. Launch tx:     ${launchTxStr.substring(0, 40)}...`);
  console.log(`\nTotal transactions to sign: ${feeConfigTxs.length + 1}`);
  console.log("\nSign these with your wallet, then use bags_send_transaction for each.");

  // Save output for reference
  const output = {
    tokenMint,
    symbol: "BSDK",
    name: "Bags SDK",
    configKey,
    initialBuySol: INITIAL_BUY_SOL,
    feeConfigTransactions: feeConfigTxs.map((t) => (typeof t === "string" ? t : t.transaction)),
    launchTransaction: launchTx,
    totalTransactionsToSign: feeConfigTxs.length + 1,
    wallet: WALLET,
  };

  const outPath = path.join(__dirname, "..", "launch-output.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log("\nFull output saved to:", outPath);
}

main().catch((err) => {
  console.error("\nLAUNCH FAILED:", err.message);
  process.exit(1);
});
