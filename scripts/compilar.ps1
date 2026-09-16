# Compila todo el arbol de fuentes (GA e IACO) a .\out usando solo el JDK.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\compilar.ps1

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Push-Location $raiz
try {
    if (Test-Path "out") { Remove-Item -Recurse -Force "out" }
    New-Item -ItemType Directory -Force "out" | Out-Null

    # El argfile lleva rutas relativas para no depender de acentos en la ruta absoluta.
    $lista = Join-Path $env:TEMP "paqtracker_sources.txt"
    $rel = Get-ChildItem -Path "src" -Recurse -Filter *.java |
           ForEach-Object { $_.FullName.Substring($raiz.Length + 1) }
    [System.IO.File]::WriteAllLines($lista, $rel)

    javac -encoding UTF-8 -d out "@$lista"
    if ($LASTEXITCODE -ne 0) { throw "javac devolvio $LASTEXITCODE" }
    Write-Host "Compilados $($rel.Count) archivos en .\out"
}
finally {
    Pop-Location
}
