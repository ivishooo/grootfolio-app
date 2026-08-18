---
title: Qué es un holding (tu posición en un activo)
slug: que-es-un-holding
status: published
---

Un **holding** es tu posición agregada en un activo: todo lo que tenés hoy de
ese activo, resumido en una sola línea. Si compraste Bitcoin cuatro veces y
vendiste una, no vas a ver cinco filas: vas a ver un holding de Bitcoin con la
cantidad que te queda y su precio promedio.

## Cómo se arma un holding

El holding no se carga a mano: **se calcula a partir de tus transacciones**.
GrootFolio toma todas las operaciones de un activo, las ordena por fecha y las
va aplicando una por una:

- cada **compra** suma unidades y suma costo (precio por cantidad, más la
  comisión);
- cada **venta** resta unidades y reduce el costo acumulado en la misma
  proporción.

Ese es el motivo por el que corregir o borrar una transacción actualiza la
posición al instante: la posición es siempre el resultado de las operaciones,
nunca un dato guardado aparte.

## Qué información tiene un holding

Cada holding muestra:

- **Cantidad**: las unidades que te quedan después de compras y ventas.
- **Precio promedio**: el costo promedio ponderado de esas unidades, en
  dólares.
- **Precio actual**: la última cotización disponible del activo.
- **Valor**: cantidad por precio actual, es decir cuánto vale hoy la posición.
- **Rentabilidad**: cuánto ganaste o perdiste sobre esa posición, en porcentaje.

## Qué es el precio promedio ponderado

Es el costo promedio de las unidades que tenés, pesado por la cantidad de cada
compra. No es el promedio simple de los precios a los que compraste.

Un ejemplo: si comprás 1 unidad a 100 dólares y después 3 unidades a 200, el
promedio simple daría 150, pero tu costo real es (100 + 600) / 4 = **175**. Ese
175 es el precio promedio ponderado, y es contra ese número que se mide si
estás ganando o perdiendo.

Las comisiones de compra están incluidas en ese costo, porque son parte de lo
que te salió entrar a la posición.

## Qué pasa cuando vendés

Vender reduce la cantidad del holding y reduce el costo acumulado en forma
proporcional, pero **no cambia el precio promedio** de lo que te queda: las
unidades que conservás siguen valiendo lo mismo que antes de la venta.

Si vendés toda la posición, el holding se cierra y deja de aparecer en tus
tenencias. Si más adelante volvés a comprar ese mismo activo, el precio
promedio arranca de cero con las compras nuevas: no arrastra el costo de la
posición anterior, que ya está cerrada y cuyo resultado quedó registrado como
P&L realizado en Reportes.

## Holdings sin precio disponible

Algunos activos no tienen cotización automática en GrootFolio; hoy es el caso
de los bonos. Esas posiciones se muestran igual, con su cantidad y su precio
promedio, pero con el precio actual y el valor en cero, y **no se suman** al
valor total ni al resultado del portafolio.

Es una decisión deliberada: contar una posición sin precio como si valiera cero
diría que perdiste todo lo invertido en ella, que es una mentira peor que
dejarla afuera del total.
