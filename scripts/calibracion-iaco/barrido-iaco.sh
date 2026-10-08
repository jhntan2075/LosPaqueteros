#!/usr/bin/env bash
# Uso: barrido-iaco.sh <PARAMETRO> <valores> <salida.csv> [--fijar-iaco-... valor ...]
# Lanza un proceso por escenario de calibracion (3 en paralelo, nunca mas).
set -euo pipefail
REPO="C:/Users/jfgut/OneDrive/Desktop/PUCP/2026 - 2/PDDS/GITHUB/LosPaqueteros"
JAVA=/c/Users/jfgut/.vscode/extensions/redhat.java-1.56.0-win32-x64/jre/21.0.12.1-win32-x86_64/bin/java.exe
ESCENARIOS="${ESCENARIOS:-esc-c01,esc-c02,esc-c03}"
PARAM=$1; VALORES=$2; SALIDA=$3; shift 3
cd "$REPO"
mkdir -p "$(dirname "$SALIDA")"
for ESC in ${ESCENARIOS//,/ }; do
  "$JAVA" -Xmx4g -cp out pe.pucp.paqtracker.experimento.BarridoCalibracion \
    --peso "$PARAM" --valores "$VALORES" --escenarios "$ESCENARIOS" --solo-escenario "$ESC" \
    --carpeta "${CARPETA:-datos/experimento}" --repeticiones 5 --dias 7 --presupuesto-evaluaciones 3550 --salida "$SALIDA" "$@" \
    > "${SALIDA%.csv}-$ESC.log" 2>&1 &
done
wait
echo "listo: $(($(wc -l < "$SALIDA") - 1)) corridas en $SALIDA"
