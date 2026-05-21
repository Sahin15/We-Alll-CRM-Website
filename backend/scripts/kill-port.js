/**
 * Free a TCP port before starting the dev server (Windows-friendly).
 * Usage: node scripts/kill-port.js 5000
 */
import { execSync } from "child_process";

const port = process.argv[2] || "5000";

function killOnWindows() {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Stopped process ${pid} on port ${port}`);
      } catch {
        /* already gone */
      }
    }
    if (pids.size === 0) console.log(`No listener found on port ${port}`);
  } catch {
    console.log(`Port ${port} is free`);
  }
}

function killOnUnix() {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, { shell: true });
    console.log(`Freed port ${port}`);
  } catch {
    console.log(`Port ${port} is free`);
  }
}

if (process.platform === "win32") killOnWindows();
else killOnUnix();
