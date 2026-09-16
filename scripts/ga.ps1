# Simulacion dinamica del algoritmo genetico (GA).
# Uso (argumentos posicionales: <ventas> <bloqueos> <dias> [mes]):
#   powershell -ExecutionPolicy Bypass -File scripts\ga.ps1 datos\ventas.v20260909 datos\bloqueos.v20260909 7 202601
#
# Sin argumentos corre enero de 2026 sobre los datos del repositorio.

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    if (-not (Test-Path "out\pe\pucp\paqtracker\servicio\SimulacionDinamica.class")) {
        & (Join-Path $PSScriptRoot "compilar.ps1")
    }
    $argumentos = @($args)
    if ($argumentos.Count -eq 0) {
        $argumentos = @("datos\ventas.v20260909", "datos\bloqueos.v20260909", "7", "202601")
    }
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    java -Xmx4g -cp out pe.pucp.paqtracker.servicio.SimulacionDinamica @argumentos
}
finally {
    Pop-Location
}
