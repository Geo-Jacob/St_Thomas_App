$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot "backend"
$pythonExe = Join-Path $repoRoot ".venv\Scripts\python.exe"
$managePy = Join-Path $backendPath "manage.py"

if (-not (Test-Path $pythonExe)) {
    throw "Python not found at $pythonExe"
}

Set-Location $backendPath

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created backend/.env from .env.example. Update POSTGRES_PASSWORD before first run." -ForegroundColor Yellow
}

if ($env:PYTHONPATH) {
    $env:PYTHONPATH = "$backendPath;$($env:PYTHONPATH)"
} else {
    $env:PYTHONPATH = $backendPath
}
& $pythonExe $managePy "migrate"
& $pythonExe $managePy "runserver" "8000"
