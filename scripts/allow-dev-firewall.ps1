# Allow local CRM dev servers through Windows Firewall (run PowerShell as Administrator)
# Run: powershell -ExecutionPolicy Bypass -File scripts/allow-dev-firewall.ps1

$rules = @(
  @{ Name = "WeAlll CRM Frontend (3000)"; Port = 3000 },
  @{ Name = "WeAlll CRM Backend (5000)"; Port = 5000 }
)

foreach ($rule in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Rule already exists: $($rule.Name)" -ForegroundColor Yellow
    continue
  }

  New-NetFirewallRule `
    -DisplayName $rule.Name `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $rule.Port `
    -Profile Any | Out-Null

  Write-Host "Added firewall rule: $($rule.Name) (TCP $($rule.Port))" -ForegroundColor Green
}

Write-Host "`nDone. Use your PC LAN IP on other devices, e.g. http://192.168.x.x:3000" -ForegroundColor Cyan
Write-Host "Find LAN IP: ipconfig | findstr IPv4" -ForegroundColor Cyan
