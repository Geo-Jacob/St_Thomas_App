param(
    [Parameter(Mandatory = $true)]
    [string]$PhoneNumber,
    [Parameter(Mandatory = $true)]
    [string]$Password,
    [Parameter(Mandatory = $true)]
    [string]$FirstName,
    [Parameter(Mandatory = $true)]
    [string]$LastName,
    [string]$Email = "",
    [string]$HouseName = "",
    [string]$WardCode = "WARD-A",
    [string]$WardName = "Ward A",
    [string]$UnitCode = "U-A1",
    [string]$UnitName = "Unit A1",
    [string]$FamilyCode = "FAM001",
    [string]$FamilyName = "Family One"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = Join-Path $repoRoot ".venv\Scripts\python.exe"
$helperPy = Join-Path $repoRoot "backend\upsert_member.py"

& $pythonExe $helperPy `
    --phone-number $PhoneNumber `
    --password $Password `
    --first-name $FirstName `
    --last-name $LastName `
    --email $Email `
    --house-name $HouseName `
    --ward-code $WardCode `
    --ward-name $WardName `
    --unit-code $UnitCode `
    --unit-name $UnitName `
    --family-code $FamilyCode `
    --family-name $FamilyName
