# Start CRM locally (backend :5000, frontend :3000)
# Run from repo root: .\scripts\start-dev.ps1

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Freeing ports 5000 and 3000..."
node "$root\backend\scripts\kill-port.js" 5000
node "$root\backend\scripts\kill-port.js" 3000

Write-Host "Starting backend on http://localhost:5000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; npm run dev"

Start-Sleep -Seconds 2

Write-Host "Starting frontend on http://localhost:3000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "Open http://localhost:3000 in your browser."
Write-Host "If backend fails with EADDRINUSE, close old terminal windows running node, then run this script again."
