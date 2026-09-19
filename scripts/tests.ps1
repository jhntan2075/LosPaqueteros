# Compila src/ y tests/, y corre todas las pruebas JUnit con el jar standalone
# de lib/ (sin Maven ni Gradle).
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\tests.ps1

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$junit = Join-Path $raiz "lib\junit-platform-console-standalone-6.1.3.jar"

Push-Location $raiz
try {
    if (-not (Test-Path $junit)) {
        throw "No se encontro $junit. Descarga el jar de JUnit a la carpeta lib\ antes de correr las pruebas."
    }

    & (Join-Path $PSScriptRoot "compilar.ps1")

    if (Test-Path "out-tests") { Remove-Item -Recurse -Force "out-tests" }
    New-Item -ItemType Directory -Force "out-tests" | Out-Null

    $lista = Join-Path $env:TEMP "paqtracker_test_sources.txt"
    $rel = Get-ChildItem -Path "tests" -Recurse -Filter *.java |
           ForEach-Object { $_.FullName.Substring($raiz.Length + 1) }
    [System.IO.File]::WriteAllLines($lista, $rel)

    javac --release 21 -encoding UTF-8 -cp "out;$junit" -d out-tests "@$lista"
    if ($LASTEXITCODE -ne 0) { throw "javac (tests) devolvio $LASTEXITCODE" }
    Write-Host "Compilados $($rel.Count) archivos de prueba en .\out-tests"

    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    java -jar $junit execute --disable-banner --scan-classpath -cp out -cp out-tests
    if ($LASTEXITCODE -ne 0) { throw "Hubo pruebas fallidas o un error de ejecucion" }
}
finally {
    Pop-Location
}
