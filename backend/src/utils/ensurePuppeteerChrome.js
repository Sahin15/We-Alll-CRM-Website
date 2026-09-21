import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");

/**
 * Resolve Puppeteer Chrome executable if already installed.
 * @returns {Promise<string|null>}
 */
export async function getPuppeteerChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  try {
    const puppeteer = await import("puppeteer");
    const p = puppeteer.default || puppeteer;
    if (typeof p.executablePath === "function") {
      const exe = p.executablePath();
      if (exe && fs.existsSync(exe)) {
        return exe;
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * Ensure Puppeteer Chrome is available; install on first use if missing.
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<string>}
 */
export async function ensurePuppeteerChrome(options = {}) {
  const { silent = false } = options;
  const existing = await getPuppeteerChromePath();
  if (existing) {
    if (!silent) {
      console.log("Puppeteer Chrome OK:", existing);
    }
    return existing;
  }

  if (!silent) {
    console.log("Installing Puppeteer Chrome (one-time, may take a minute)...");
  }

  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["puppeteer", "browsers", "install", "chrome"],
    {
      cwd: backendRoot,
      stdio: silent ? "pipe" : "inherit",
      shell: true,
    }
  );

  if (result.status !== 0) {
    throw new Error(
      "Failed to install Chrome for Puppeteer. From the backend folder run: npm run puppeteer:install"
    );
  }

  const installed = await getPuppeteerChromePath();
  if (!installed) {
    throw new Error(
      "Chrome install finished but executable not found. Set CHROME_PATH in .env to your Chrome binary."
    );
  }

  if (!silent) {
    console.log("Puppeteer Chrome installed:", installed);
  }

  return installed;
}
