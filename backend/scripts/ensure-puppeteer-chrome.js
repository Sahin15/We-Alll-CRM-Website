/**
 * Ensures Puppeteer Chrome is installed before PDF generation.
 * Run automatically via npm start, or manually: node scripts/ensure-puppeteer-chrome.js
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

async function getExecutablePath() {
  try {
    const puppeteer = await import("puppeteer");
    const p = puppeteer.default || puppeteer;
    if (typeof p.executablePath === "function") {
      const exe = p.executablePath();
      if (exe && fs.existsSync(exe)) return exe;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function main() {
  const existing = await getExecutablePath();
  if (existing) {
    console.log("Puppeteer Chrome OK:", existing);
    return;
  }

  console.log("Installing Puppeteer Chrome (one-time, may take a minute)...");
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["puppeteer", "browsers", "install", "chrome"],
    {
      cwd: backendRoot,
      stdio: "inherit",
      shell: true,
    }
  );

  if (result.status !== 0) {
    console.error(
      "Failed to install Chrome for Puppeteer. Run manually:\n  cd backend\n  npx puppeteer browsers install chrome"
    );
    process.exit(1);
  }

  const after = await getExecutablePath();
  if (!after) {
    console.error("Chrome install finished but executable not found. Set CHROME_PATH in .env to your Chrome binary.");
    process.exit(1);
  }
  console.log("Puppeteer Chrome installed:", after);
}

main();
