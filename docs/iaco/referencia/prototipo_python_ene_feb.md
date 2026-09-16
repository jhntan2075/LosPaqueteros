# Resultados IACO v02 vs v2.1 — Enero y Febrero 2026

Mismo simulador para ambas versiones. Ciclo 30 min, 37 unidades.

| Métrica | v02 Ene | v2.1 Ene | v02 Feb | v2.1 Feb |
|---|---|---|---|---|
| Pedidos | 641 | 641 | 953 | 953 |
| Tardíos | 1 | 1 | 2 | 1 |
| Tardíos factibles | 0 | 0 | 1 (id 691, 48 min) | 0 |
| Infactible (atraso) | 558 (18 min) | 558 (18 min) | 213 (26 min) | 213 (26 min) |
| km totales | 19 582 | 23 902 | 27 806 | 34 824 |
| km en vacío | 0 | 1 170 | 0 | 1 380 |
| Costo | 14 184 | 7 992 | 22 039 | 11 955 |
| t/plan medio (ms) | 103 | 185 | 145 | 244 |
| t/plan máx (ms) | 521 | 631 | 629 | 969 |

Pedidos 558 y 213: infactibles con criterio "fin de la hora de entrega"
(verificado con `factibilidad.py`); factibles con criterio "llegada al cliente".

Referencia inicial (simulador sin corregir): v02 con 15 tardíos en enero y 19 en febrero.

## Mejoras IACO v2.1
- M1 Siembra por urgencia y elección de unidad con feromona zona–tipo.
- M2 12 candidatos y visibilidad con urgencia (urg/d).
- M3 Feromona zonal (celdas 10×10 km) persistente entre ciclos.
- M4 MAX-MIN: τ ∈ [0.05, 1], RHO = 0.10, reinicio parcial por estancamiento.
- M5 Holgura de seguridad de 45 min con respaldo a la unidad de mayor holgura.
- M6 Primer tramo con tiempo real (A* con bloqueos).
- M7 Pulido real: atraso y fin de turno → reordenar, reasignar o recortar.
- M8 Reserva de 2 autos y 1 moto ociosos en cada almacén intermedio.
- M9 Pedidos sin salida a tiempo: despacho individual en la unidad que termina antes.
- Rendimiento: 15 hormigas, ≤25 iteraciones, búsqueda local solo en las 3 mejores, parada tras 6 sin mejora.

## Parámetros v2.1
M=15, iteraciones=25, ALFA=1.0, BETA_H=2.0, G_URG=1.0, RHO=0.10, Q=5, τmax=1.0, τmin=0.05,
K=12, BUFFER=45 min, ESTANCA=4, PARADA=6, LS=3, reserva={TA:2, TM:1}, aptitud por costo,
BETA=5000, DELTA=30, umbral de holgura=90 min.
