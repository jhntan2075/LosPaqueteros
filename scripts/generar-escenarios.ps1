# Genera el banco de 40 escenarios del experimento numerico (ISA).
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\generar-escenarios.ps1
#       powershell -ExecutionPolicy Bypass -File scripts\generar-escenarios.ps1 --salida datos\experimento --semilla-base 20260923
#
# Es determinista: con la misma semilla base regenera el banco identico.

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    if (-not (Test-Path "out\pe\pucp\paqtracker\experimento\GeneradorEscenarios.class")) {
        & (Join-Path $PSScriptRoot "compilar.ps1")
    }
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    java -cp out pe.pucp.paqtracker.experimento.GeneradorEscenarios @args
}
finally {
    Pop-Location
}
