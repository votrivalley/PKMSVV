$ErrorActionPreference = "Stop"
$bin = Get-ChildItem "dist/lan-windows/win-unpacked" -Filter "*.exe" | Where-Object { $_.Name -notlike "*Uninstall*" } | Select-Object -First 1
if (-not $bin) { throw "Packaged LAN executable not found in win-unpacked." }
Write-Host "Smoke test starting $($bin.FullName)"
$proc = Start-Process -FilePath $bin.FullName -PassThru
$game = "http://127.0.0.1:37816/game/"
$healthy = $false
try {
  for ($i=0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    $current = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if (-not $current) {
      throw "Packaged app closed during startup before LAN game could load."
    }
    try {
      $page = Invoke-WebRequest -Uri $game -TimeoutSec 3 -UseBasicParsing
      if ($page.StatusCode -eq 200 -and $page.Content -match 'scr-menu') {
        $healthy = $true
        if ($i -ge 3) { break }
      }
    } catch {}
  }
  if (-not $healthy) { throw "Packaged app did not serve full /game/ page on LAN." }
  # The earlier ERR_ABORTED killed the Electron window while HTTP had started.
  Start-Sleep -Seconds 5
  if (-not (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue)) {
    throw "Packaged app crashed after serving LAN page."
  }
  Write-Host "PASS: Packaged Windows game remains alive and serves /game/ directly."
} finally {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process |
    Where-Object { $_.Name -like "*Chuyển sinh LAN*" -and $_.ProcessId -ne $proc.Id } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if (-not $healthy) {
    $log = Join-Path $env:APPDATA "PKMSVV-LAN-Beta/lan-host-startup.log"
    if (Test-Path $log) { Write-Host "Startup log:"; Get-Content $log -Tail 50 }
  }
}
