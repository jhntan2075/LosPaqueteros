# Barrido univariado (OFAT) de un peso de la funcion objetivo. Etapa 1 del
# experimento numerico: un peso a la vez, con los otros tres fijos, solo GA.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\barrido.ps1 `
#       --peso SIN_RUTEAR_BASE --valores "1000,2500,5000,10000,20000" `
#       --dias 7 --repeticiones 5 --salida resultados\calibracion-sin-rutear.csv
#
# Pesos: SIN_RUTEAR_BASE, TARDANZA_BASE, POR_MINUTO_TARDE, HOLGURA_BLANDA.
#
# Tras elegir el codo de un barrido, el valor elegido se fija en el siguiente
# con --fijar-sin-rutear, --fijar-tardanza-base, --fijar-minuto-tarde o
# --fijar-holgura-blanda.
#
# Cuidado: PowerShell parte 1000,2500 en dos argumentos. Hay que entrecomillar
# siempre el valor de --valores.

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    if (-not (Test-Path "paqtracker-experimentacion\target\classes\pe\pucp\paqtracker\experimentacion\BarridoCalibracion.class")) {
        & (Join-Path $PSScriptRoot "compilar.ps1")
    }
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    java -Xmx4g -cp "paqtracker-experimentacion\target\classes;paqtracker-planificador-nucleo\target\classes" pe.pucp.paqtracker.experimentacion.BarridoCalibracion @args
}
finally {
    Pop-Location
}
