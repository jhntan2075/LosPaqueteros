# Calibración del IACO (etapa 2 del experimento)

Rama de archivo. **No fusionar con main.** Se conserva para poder reproducir y auditar los resultados de la calibración del IACO.

- Rama: `feature/calibracion-iaco`
- Partió del commit de main: `23f16ee5e17689be1f69d70e0c35a0a7fcf3c602`
- Documento que respalda: `22.dis.experim.v02`, sección 10.2, subsección "Algoritmo IACO" (Tablas 21 a 26).
- El algoritmo elegido en la comparación final fue el GA. El IACO no pasó a producción.

## Qué se hizo

Barridos de un parámetro a la vez (los demás fijos) para los 5 parámetros del IACO, en este orden: hormigas, β, α, ρ y peso de la hormiga elitista. 10 repeticiones por escenario y valor (n = 30 por valor), 7 días simulados, 600 corridas en total. Escenarios de calibración definitivos:

- `datos/ventas.v20260909/ventas.202703.txt` (escenario real)
- `datos/experimento/t330/esc-t03.ventas.txt`
- `datos/experimento/t330/esc-t04.ventas.txt`

Valores adoptados: hormigas = 100, β = 7, α = 2, ρ = 0,1, ELITE = 10.

## Qué contiene la rama

- `src/.../experimento/BarridoCalibracion.java`: corredor de los barridos (opciones `--repeticion-desde`, `--fijar-iaco-*` y `--solo-escenario`).
- `src/.../planificador/PlanificadorIACO.java`: corrige un defecto de semillas. Con 132 hormigas o más, los flujos aleatorios se repetían desde la hormiga 131. Afectaba al valor 200 del barrido de hormigas.
- `datos/experimento/`: escenarios de calibración (`definitivo/`, `t330/`, `esc-t01` a `esc-t05`).
- Cambios de código traídos desde `feature/GA-include-breakdown` (GA, evaluador de fitness, verificador de invariantes, orquestador).
- `scripts/calibracion-iaco/`: scripts usados en la calibración.

## Scripts

- `barrido-iaco.sh` y `barrido-def.sh`: lanzan los barridos.
- `analizar.js`: normaliza el fitness por escenario y calcula medias, desviaciones e IC 95 %.
- `comparar-n.js`: repite el análisis con n = 15 (repeticiones 1 a 5) para comprobar que las decisiones se sostienen.

**Atención:** los dos `.sh` tienen rutas absolutas de la máquina original (`REPO=` y `JAVA=`). Se dejaron sin cambios a propósito, para que sean idénticos a lo que se ejecutó. Ajustarlas antes de usarlos en otra máquina.

## Resultados (CSV)

No están en el repositorio: `resultados/calibracion-iaco/` está en `.gitignore`. Respaldo en la laptop personal del desarrollador

Archivos principales: `barrido{1..5}-*-definitivo.csv` y sus versiones `-normalizado.csv`.