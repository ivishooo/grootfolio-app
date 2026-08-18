---
title: Los reportes de tu cartera
slug: los-reportes
status: published
---

La sección **Reportes** es la mirada histórica de tu cartera. Mientras el
Dashboard te dice cómo estás hoy, los reportes te dicen **qué pasó**: qué
vendiste, cuánto ganaste con eso y cómo evolucionó tu patrimonio.

## Qué reportes puedo ver de mi cartera

Hay cuatro bloques:

1. **P&L realizado acumulado**: la ganancia o pérdida que ya se materializó con
   tus ventas, acumulada a lo largo del tiempo.
2. **Balance histórico (mark-to-market)**: cuánto valía tu cartera mes a mes,
   valuada a los precios de cada momento.
3. **P&L realizado por activo**: el detalle de cuánto te dejó cada activo que
   vendiste.
4. **Ledger de operaciones**: el listado completo de todas tus transacciones.

## P&L realizado acumulado

Es una serie que va sumando el resultado de cada venta. Cada vez que vendés,
GrootFolio compara lo que cobraste contra el costo promedio de las unidades que
vendiste, y esa diferencia se suma al acumulado.

Si todavía no vendiste nada, este panel aparece vacío: sin ventas no hay
resultado realizado, por más que tu cartera esté ganando en papel.

## Balance histórico

Muestra la evolución del valor de tu cartera mes a mes. Es una valuación
*mark-to-market*: cada mes se calcula con los precios de ese momento, no con
los de hoy.

Como depende de precios históricos, arranca a tener sentido recién cuando hay
algunos meses de operaciones cargadas.

## P&L realizado por activo

Una tabla con una fila por activo vendido, con estas columnas: **Activo**,
**Tipo**, **Cantidad vendida**, **Ingresos** (lo que cobraste), **Costo** (lo
que te habían costado esas unidades) y **Realizado** (la diferencia entre los
dos).

Sirve para responder la pregunta concreta de qué operaciones te dejaron
resultado y cuáles no.

## Ledger de operaciones

Es el historial completo, con la operación más reciente arriba: **Fecha**,
**Activo**, **Operación** (compra o venta), **Cantidad**, **Precio** y **Monto
USD**.

Dos detalles importantes del ledger:

- Incluye **todas** tus operaciones, también las de posiciones que ya cerraste
  y que por eso no aparecen en el Dashboard.
- Cada operación se valúa en dólares con el **tipo de cambio de su fecha**, no
  con el de hoy. Cuando no se pudo conseguir la cotización exacta de ese día, la
  fila queda marcada como **FX aproximado**.

Ese criterio es distinto del que usa el Dashboard, que convierte con el tipo de
cambio actual. Son dos preguntas diferentes: el ledger reconstruye el pasado
tal como fue, el Dashboard valúa el presente.
