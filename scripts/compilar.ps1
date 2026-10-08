# Compila el nucleo y el banco de experimentacion con el Maven Wrapper (sin pruebas).
# Las clases quedan en <modulo>\target\classes, que es el classpath que usan los demas scripts.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\compilar.ps1

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    & .\mvnw.cmd -B -q -ntp -pl paqtracker-experimentacion -am compile
    if ($LASTEXITCODE -ne 0) { throw "mvnw compile devolvio $LASTEXITCODE" }
    Write-Host "Compilados paqtracker-planificador-nucleo y paqtracker-experimentacion"
}
finally {
    Pop-Location
}
