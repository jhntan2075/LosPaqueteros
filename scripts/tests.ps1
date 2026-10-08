# Corre las pruebas JUnit de todos los modulos Maven con el Maven Wrapper.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\tests.ps1
#       powershell -ExecutionPolicy Bypass -File scripts\tests.ps1 -pl paqtracker-planificador-nucleo

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    & .\mvnw.cmd -B -ntp @args test
    if ($LASTEXITCODE -ne 0) { throw "Hubo pruebas fallidas o un error de compilacion" }
}
finally {
    Pop-Location
}
