# Registro de calibración del prototipo Python (retirado)

Antes de la implementación Java existió un prototipo en Python que sirvió para
calibrar la IACO v2.1. **Ese código ya no forma parte del proyecto**: Java es la única
implementación.

Lo que queda aquí son sus dos documentos de resultados, conservados porque son la
línea base contra la que se validó el puerto:

| Archivo | Contenido |
|---|---|
| `prototipo_python_ene_feb.md` | IACO v02 vs v2.1, enero y febrero de 2026, y la lista de mejoras M1–M9 con sus parámetros |
| `prototipo_python_ene_jun.md` | IACO v02 vs v2.1, enero a junio de 2026, con los pedidos infactibles de cada mes y las mejoras M7, M8 y M10 |

La comprobación que justifica conservarlos: la lista de pedidos imposibles que calcula
`AnalizadorFactibilidad` en Java coincide **pedido por pedido** con la que reporta
`prototipo_python_ene_jun.md` en los seis meses, incluido el caso 2202 de junio, que no
tiene salida a tiempo en ningún horario. Ver §2 de [`../resultados.md`](../resultados.md).

Dos advertencias sobre estos números, por si se usan como referencia:

- Las filas de **enero a abril** se produjeron con una configuración distinta de la de
  mayo y junio: el propio documento indica que la corrección de M8 y el agregado de M10
  no se volvieron a correr en esos meses.
- El puerto Java de la v2.1 **no es bit a bit idéntico** al prototipo (~2,5 % de
  diferencia en costo, cumplimiento idéntico). Por eso todas las comparaciones del
  informe son Java contra Java.
