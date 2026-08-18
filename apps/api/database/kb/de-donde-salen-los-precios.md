---
title: De dónde salen los precios y cada cuánto se actualizan
slug: de-donde-salen-los-precios
status: published
---

Los precios que ves en GrootFolio no los carga nadie a mano: se consultan
automáticamente a proveedores externos y se guardan en la aplicación para no
tener que pedirlos otra vez en cada pantalla.

## Qué proveedor cotiza cada tipo de activo

- **Criptomonedas**: CoinGecko.
- **Acciones** (estadounidenses y argentinas): Yahoo Finance.
- **Divisas**: un proveedor de tipos de cambio de referencia.
- **Bonos**: por ahora **no tienen cotización automática**.

Todos los precios se llevan a dólares, que es la moneda base de la aplicación.
Cuando un activo cotiza en otra moneda —por ejemplo una acción argentina, que
cotiza en pesos— se convierte usando la cotización de esa moneda.

## Cada cuánto se actualizan

Las cotizaciones se guardan con una vigencia corta: del orden de un minuto en
la memoria de la aplicación y de unos pocos minutos en la base de datos.
Pasado ese tiempo, la próxima consulta va a buscar el precio fresco al
proveedor.

En la práctica eso significa que el Dashboard trabaja con precios de hace
minutos, no con cotizaciones en tiempo real al segundo. Para seguir un
portafolio de inversiones personales es más que suficiente, y evita
sobrecargar de pedidos a los proveedores.

## Qué pasa si un proveedor no responde

GrootFolio degrada con cuidado en vez de romperse:

1. Primero intenta el precio fresco del proveedor.
2. Si el proveedor no responde o corta por límite de consultas, usa el último
   precio guardado, aunque esté vencido.
3. Recién si nunca tuvo un precio para ese activo, lo marca como **sin
   cotización disponible**.

Un activo sin cotización se muestra en tus tenencias con su cantidad y su
precio promedio, pero con valor cero, y no participa del valor total ni del
resultado de la cartera.

## Por qué los bonos aparecen sin precio

Porque todavía no hay un proveedor de precios conectado para bonos. Podés
cargar las operaciones y el sistema lleva bien la cantidad y el costo, pero no
puede decirte cuánto valen hoy ni cuánto ganaste con ellos.
