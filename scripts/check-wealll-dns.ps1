# Diagnose wealll.cloud DNS and WiFi reachability
# Run: powershell -ExecutionPolicy Bypass -File scripts/check-wealll-dns.ps1

$domain = "wealll.cloud"
Write-Host "`n=== DNS for $domain ===" -ForegroundColor Cyan
try {
  $records = Resolve-DnsName $domain -Type A -ErrorAction Stop
  $records | Format-Table Name, Type, IPAddress, TTL -AutoSize
} catch {
  Write-Host "DNS lookup failed: $_" -ForegroundColor Red
}

$ip = ($records | Select-Object -First 1).IPAddress
if ($ip) {
  Write-Host "`n=== Reachability to $ip (HTTPS) ===" -ForegroundColor Cyan
  $tcp = Test-NetConnection -ComputerName $ip -Port 443 -WarningAction SilentlyContinue
  Write-Host "Port 443 open: $($tcp.TcpTestSucceeded)"

  if ($ip -like "91.108.*" -or $ip -like "91.105.*" -or $ip -like "149.154.*") {
    Write-Host "`nPROBLEM: $domain points to a Telegram IP ($ip)." -ForegroundColor Red
    Write-Host "Many WiFi routers/ISPs block Telegram IPs. Mobile data often still works." -ForegroundColor Yellow
    Write-Host "Fix: In Hostinger hPanel -> Domains -> DNS, set the A record to your VPS public IP." -ForegroundColor Green
    Write-Host "Get VPS IP: ssh root@YOUR_VPS -> curl -4 ifconfig.me" -ForegroundColor Green
  }
}

Write-Host "`n=== HTTPS to https://$domain/api/health ===" -ForegroundColor Cyan
try {
  $res = Invoke-WebRequest -Uri "https://$domain/api/health" -UseBasicParsing -TimeoutSec 15
  Write-Host "OK ($($res.StatusCode)): $($res.Content)"
} catch {
  Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
