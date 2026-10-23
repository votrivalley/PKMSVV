# Pokémon Survivor — build riêng NSP Home Menu từ NRO (Windows + NTON).
# prod.keys luôn nằm trên máy cá nhân, không được gửi lên GitHub/chat.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$SwitchSdRoot)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $SwitchSdRoot).Path
$nro = Join-Path $root 'switch\PKMSVV.nro'
$brewser = Join-Path $root 'switch\brewser.nro'
$game = Join-Path $root 'switch\brewser\apps\com.votrivalley.pkmsvv\index.html'
$icon = Join-Path $PSScriptRoot 'pokemon-survivor-home.jpg'
if (-not (Test-Path -LiteralPath $nro -PathType Leaf)) { throw "Thiếu switch/PKMSVV.nro: $nro" }
if (-not (Test-Path -LiteralPath $brewser -PathType Leaf)) { throw "Thiếu switch/brewser.nro: $brewser" }
if (-not (Test-Path -LiteralPath $game -PathType Leaf)) { throw "Thiếu dữ liệu game: $game" }
if (-not (Test-Path -LiteralPath $icon -PathType Leaf)) { throw "Thiếu icon pokemon-survivor-home.jpg trong cùng thư mục script." }
if (-not (Get-Command nton -ErrorAction SilentlyContinue)) { throw "Chưa cài NTON: https://github.com/rlaphoenix/nton/releases" }
Push-Location $PSScriptRoot
try {
    & nton build $nro --sdmc '/switch/PKMSVV.nro' --name 'Pokémon Survivor' --publisher 'Votri Valley' --version '1.2.0' --icon $icon
    if ($LASTEXITCODE -ne 0) { throw "NTON thất bại (exit $LASTEXITCODE); kiểm tra NRO và prod.keys cục bộ." }
    Write-Host "Hoàn tất. Xem đường dẫn NSP đầu ra do NTON hiển thị." -ForegroundColor Green
} finally {
    Pop-Location
}
