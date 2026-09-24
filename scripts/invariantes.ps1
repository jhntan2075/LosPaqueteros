# Verifica las cuatro invariantes de la funcion objetivo para una combinacion
# de pesos. Devuelve codigo 0 si las cuatro se cumplen y 1 si alguna falla, para
# poder encadenarlo en los barridos de la etapa 1.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\invariantes.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\invariantes.ps1 --peso-sin-rutear 10000

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    if (-not (Test-Path "out\pe\pucp\paqtracker\experimento\VerificadorInvariantes.class")) {
        & (Join-Path $PSScriptRoot "compilar.ps1")
    }
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    java -cp out pe.pucp.paqtracker.experimento.VerificadorInvariantes @args
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
