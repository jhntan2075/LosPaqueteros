# Resultados IACO v02 vs v2.1 — Enero a Junio 2026

Mismo simulador para ambas versiones. Ciclo 30 min, 37 unidades. Código v2.1 sin cambios entre meses.

## Cumplimiento

| Mes | Pedidos | Infactibles (atraso mínimo) | v02 tardíos | v02 tardíos factibles | v2.1 tardíos | v2.1 tardíos factibles |
|---|---|---|---|---|---|---|
| Enero | 641 | 558 (18) | 1 | 0 | 1 | 0 |
| Febrero | 953 | 213 (26) | 2 | 1 | 1 | 0 |
| Marzo | 1 544 | 160 (2), 284 (31), 776 (5) | 6 | 3 | 3 | 0 |
| Abril | 2 033 | 343 (48) | 3 | 2 | 1 | 0 |

En v2.1 cada infactible sale con exactamente su atraso mínimo. En v02 los infactibles
de marzo salen con 37, 136 y 32 min de atraso.

Tardíos factibles de v02: feb 691 (48 min); mar 775 (106), 789 (48), 1063 (10); abr 1155 (116), 1944 (268).

## Costo, distancia y cómputo

| Mes | v02 km | v2.1 km (vacío) | v02 costo | v2.1 costo | Ahorro | v02 t/plan medio–máx (ms) | v2.1 t/plan medio–máx (ms) |
|---|---|---|---|---|---|---|---|
| Enero | 19 582 | 23 902 (1 170) | 14 184 | 7 992 | 44 % | 103–521 | 185–631 |
| Febrero | 27 806 | 34 824 (1 380) | 22 039 | 11 955 | 46 % | 145–629 | 244–969 |
| Marzo | 41 898 | 53 382 (1 626) | 32 726 | 18 310 | 44 % | 180–1 002 | 308–1 741 |
| Abril | 53 818 | 69 848 (2 442) | 42 704 | 25 544 | 40 % | 237–1 432 | 333–1 628 |

v2.1 recorre ~27–30 % más km: usa más bicicletas (baratas y lentas) y hace
reposicionamientos en vacío para reservar autos en los almacenes intermedios.

## Notas
- Infactibles: criterio "fin de la hora de entrega", verificados con `factibilidad.py`
  (mejor almacén, vehículo más rápido, mejor refrigerio, sin bloqueos). Con criterio
  "llegada al cliente" no hay infactibles en ningún mes.
- Parámetros y mejoras M1–M9: ver `resultados_ene_feb.md` y `iaco_v21.py`.

## Mayo y Junio (v2.1 con M8 en los tres almacenes y M10)

Los pedidos imposibles de cumplir se calculan ahora también con bloqueos (`fact_bloq.py`):
una ruta real que ni saliendo desde el mejor almacén, en auto y a la mejor hora llega a tiempo.
Enero a abril no tienen imposibles por bloqueo.

| Mes | Pedidos | Imposibles (turno / bloqueo) | Tardíos v2.1 | Tardíos evitables | km (vacío) | Costo | t/plan medio–máx (ms) |
|---|---|---|---|---|---|---|---|
| Mayo | 2 724 | 9 (5 / 4) | 9 | 0 | 96 464 (6 552) | 38 355 | 337–1 458 |
| Junio | 3 212 | 11 (6 / 5) | 11 | 0 | 116 192 (10 512) | 48 734 | 358–1 677 |

Imposibles de mayo: 864, 1331, 1455, 1646, 2320 (turno); 484, 1476, 1946, 1979 (bloqueo).
Imposibles de junio: 882, 1165, 1329, 2584, 2664, 3189 (turno); 178, 746, 782, 2202, 3111 (bloqueo).
Todos salen con su atraso mínimo (2202 no tiene salida a tiempo en ningún horario).

La línea base v02 no se corrió en mayo y junio.
La corrección de M8 y el agregado de M10 no se volvieron a correr en enero–abril.

## Mejoras agregadas tras abril
- M7: si ninguna unidad cumple, se despacha la opción de menor atraso real, si supera al turno siguiente.
- M8: reserva de 2 autos y 1 moto en los tres almacenes (antes solo intermedios); cuenta
  las unidades que llegan en la próxima hora.
- M10: si salir más tarde en el mismo turno (tras un desbloqueo) entrega a tiempo, el pedido espera.
