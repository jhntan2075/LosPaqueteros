#!/usr/bin/env bash
# Uso: barrido-def.sh <PARAMETRO> <valores> <salida.csv> <repeticionDesde> [--fijar-iaco-... valor ...]
# Corre 5 repeticiones (desde <repeticionDesde>) en los 3 escenarios definitivos,
# con 3 procesos como maximo. Marzo (el mas lento) se reparte entre los tres
# procesos; la semilla depende solo de escenario y repeticion, no del reparto.
set -euo pipefail
REPO="C:/Users/jfgut/OneDrive/Desktop/PUCP/2026 - 2/PDDS/GITHUB/LosPaqueteros"
JAVA=/c/Users/jfgut/.vscode/extensions/redhat.java-1.56.0-win32-x64/jre/21.0.12.1-win32-x86_64/bin/java.exe
ESCENARIOS="real-202703,t330-esc-t03,t330-esc-t04"
PARAM=$1; VALORES=$2; SALIDA=$3; D=$4; shift 4
cd "$REPO"
mkdir -p "$(dirname "$SALIDA")"
LOG="${SALIDA%.csv}-rep$D"
corre() {  # escenario desde cantidad
  "$JAVA" -Xmx4g -cp out pe.pucp.paqtracker.experimento.BarridoCalibracion \
    --peso "$PARAM" --valores "$VALORES" --carpeta datos/experimento/definitivo \
    --escenarios "$ESCENARIOS" --solo-escenario "$1" --repeticion-desde "$2" --repeticiones "$3" \
    --dias 7 --presupuesto-evaluaciones 3550 --salida "$SALIDA" "${EXTRA[@]}"
}
EXTRA=("$@")
( corre real-202703 "$D" 2 ) > "$LOG-p1.log" 2>&1 &
( corre real-202703 $((D+2)) 2 && corre t330-esc-t03 "$D" 5 ) > "$LOG-p2.log" 2>&1 &
( corre real-202703 $((D+4)) 1 && corre t330-esc-t04 "$D" 5 ) > "$LOG-p3.log" 2>&1 &
wait
echo "listo: $(($(wc -l < "$SALIDA") - 1)) corridas en $SALIDA"
