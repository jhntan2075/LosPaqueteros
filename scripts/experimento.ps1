# Una corrida del experimento numerico (ISA): un escenario, un algoritmo, una semilla.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\experimento.ps1 `
#       --escenario esc-01 --algoritmo GA --semilla 1 --repeticion 1 `
#       --dias 30 --presupuesto-evaluaciones 3550 --salida resultados\corridas.csv
#
# El CSV de salida es append-safe: varias invocaciones en paralelo pueden
# escribir en el mismo archivo sin corromperlo.
#
# Cuidado con --cortes: PowerShell parte 1,7,30 en tres argumentos distintos.
# Hay que entrecomillarlo siempre:  --cortes "1,7,30"

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    if (-not (Test-Path "out\pe\pucp\paqtracker\experimento\CorredorExperimento.class")) {
        & (Join-Path $PSScriptRoot "compilar.ps1")
    }
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    java -Xmx4g -cp out pe.pucp.paqtracker.experimento.CorredorExperimento @args
}
finally {
    Pop-Location
}
