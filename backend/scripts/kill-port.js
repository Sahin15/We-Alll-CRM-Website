/**
 * Free a TCP port before starting the dev server.
 * Usage: node scripts/kill-port.js 5000
 */
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const port = String(Number.parseInt(process.argv[2] || "5000", 10));
if (!/^\d+$/.test(port) || port === "0") {
  console.error("Usage: node scripts/kill-port.js <port>");
  process.exit(1);
}

/**
 * @param {string} script
 * @returns {string}
 */
function powershell(script) {
  const dir = mkdtempSync(join(tmpdir(), "kill-port-"));
  const file = join(dir, "kill-port.ps1");
  try {
    writeFileSync(file, script, "utf8");
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-File", file],
      { encoding: "utf8" }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * netstat on Windows can report this bind as PID 0. Get-NetTCPConnection
 * returns the real owner, including a server listening on IPv6 "::".
 * @returns {string[]}
 */
function windowsListenerPids() {
  const script = [
    `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue |`,
    "Where-Object { \"$($_.State)\" -eq 'Listen' -and $_.OwningProcess -gt 0 } |",
    "ForEach-Object { $_.OwningProcess } |",
    "Sort-Object -Unique",
  ].join("\n");
  const out = powershell(script);
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((pid) => /^\d+$/.test(pid) && pid !== "0");
}

/**
 * @param {string} pid
 * @returns {{ parentPid: string, command: string }}
 */
function windowsProcess(pid) {
  const script = [
    `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${pid}";`,
    "if (-not $p) { exit 0 };",
    "Write-Output $p.ParentProcessId;",
    "Write-Output $p.CommandLine",
  ].join(" ");
  const lines = powershell(script).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    parentPid: lines[0] && /^\d+$/.test(lines[0]) ? lines[0] : "",
    command: lines.slice(1).join(" "),
  };
}

function killOnWindows() {
  let pids = [];
  try {
    pids = windowsListenerPids();
  } catch (error) {
    console.error(`Could not inspect port ${port}:`, error?.message || error);
    process.exit(1);
  }

  if (pids.length === 0) {
    console.log(`No listener found on port ${port}`);
    return;
  }

  const killed = new Set();
  for (const pid of pids) {
    const info = windowsProcess(pid);
    const parent = info.parentPid ? windowsProcess(info.parentPid) : { command: "" };
    const nodemonOwnsIt = /nodemon/i.test(`${info.command} ${parent.command}`);
    const target = nodemonOwnsIt && parent.command && /nodemon/i.test(parent.command)
      ? info.parentPid
      : pid;
    if (!target || killed.has(target)) continue;
    try {
      execFileSync("taskkill", ["/PID", target, "/T", "/F"], { stdio: "ignore" });
      killed.add(target);
      console.log(`Stopped process ${target} on port ${port}`);
    } catch {
      /* already gone */
    }
  }
}

function killOnUnix() {
  try {
    execFileSync("sh", ["-c", `lsof -ti :${port} | xargs kill -9`], { stdio: "ignore" });
    console.log(`Freed port ${port}`);
  } catch {
    console.log(`Port ${port} is free`);
  }
}

if (process.platform === "win32") killOnWindows();
else killOnUnix();
