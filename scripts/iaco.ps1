# Banco de pruebas del algoritmo IACO (Improved Ant Colony Optimization).
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 meses
#   powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 simular --mes 202601 --algoritmo v30
#   powershell -ExecutionPolicy Bypass -File scripts\iaco.ps1 comparar --mes 202601,202602 --salida docs\iaco\resultados.md
#
# Si no se indica --datos, se usa la carpeta datos\ del repositorio.

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    if (-not (Test-Path "out\pe\pucp\paqtracker\iaco\app\Main.class")) {
        & (Join-Path $PSScriptRoot "compilar.ps1")
    }
    $argumentos = @($args)
    if ($argumentos -notcontains "--datos") { $argumentos += @("--datos", "datos") }
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    java -Xmx4g -cp out pe.pucp.paqtracker.iaco.app.Main @argumentos
}
finally {
    Pop-Location
}
