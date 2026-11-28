# ADR-0007: Variación del día desde los proveedores y divisas valuadas al dólar BNA

- **Estado:** Propuesto — 2026-11-28
- **Autores:** Ivan Otero
- **Tarea:** GF-019
- **Relacionado:** [ADR-0005](0005-valuacion-cedears-y-fx.md) (FX de la fecha de
  la operación y `FX_ARS_SOURCE`), [ADR-0006](0006-groot-asistente-y-nav.md)
  (Groot y su tono «bajó fuerte»).

## Contexto

El rediseño v2 dejó sin dibujar todo lo que depende de cuánto se movió la cartera
**hoy**: el chip «▲ 1,2 % hoy» de Inicio y Activos, el tono «bajó fuerte» de Groot
(`BAJA_FUERTE = -2` en `packages/shared/src/utils/groot.ts`) y, más adelante, la
notificación `groot.drop`. `GET /portfolio` solo conocía el precio actual de cada
activo, no el de referencia contra el cual medir el día.

Había dos lugares de donde sacar ese precio de referencia:

1. **`price_snapshots`:** el último snapshot anterior a las 00:00 de hoy.
2. **Los proveedores:** la mayoría ya informa la variación en la misma respuesta
   que trae el precio.

Al revisar el caso de las divisas apareció un segundo problema. El peso
argentino se convertía con el dólar de `FX_ARS_SOURCE` (CCL por default, ADR-0005)
para **todo**, también para el dólar y el peso cargados como divisa. Así, alguien
que compraba US$ 100 en el banco a $ 1.600 el 27/11/2026 quedaba con un costo de
$ 160.000 / $ 1.750 (CCL) ≈ US$ 91 y veía una ganancia de 9,4 % el mismo día de
la compra. No es rentabilidad: es la brecha entre el dólar oficial y el CCL.

## Decisión

### 1. La variación del día sale de los proveedores, en la misma llamada del precio

| Tipo | Referencia | Fuente |
|---|---|---|
| crypto | últimas 24 h (crypto no tiene cierre) | CoinGecko `/simple/price` con `include_24hr_change=true` → `usd_24h_change` |
| stock | cierre anterior, **en la moneda en que cotiza** | Yahoo `quote` → `regularMarketPreviousClose` |
| currency | tasa de ayer (hora argentina) | ARS: dólar BNA (argentinadatos `oficial`); resto: Frankfurter por fecha |
| bond | sin cotización → sin variación (`null`) | — |

El dato viaja con el precio por la cascada de `price_service`: caché en memoria y
`price_snapshots.raw.dayChangePct`, **sin migración** (la columna `raw` ya existía).

`GET /portfolio` devuelve `dayChangePercent` por holding y para la cartera. El de
la cartera se pondera por valor: se reconstruye el valor de ayer de cada holding
(`value / (1 + pct/100)`) y se compara la suma contra la de hoy. Los holdings sin
dato quedan afuera de ambos lados.

`null` significa «no sé», nunca «no se movió». El chip no se dibuja y Groot dice el
valor sin la variación.

### 2. Las divisas se valúan al dólar oficial del Banco Nación

Los activos de tipo `currency` (el dólar y el peso como divisa) usan el **dólar
BNA**, sin importar `FX_ARS_SOURCE`:

- **Precio de hoy:** dolarapi `/dolares/oficial`, punto medio entre compra y venta.
- **Base de costo y referencia de ayer:** argentinadatos, serie `oficial`, por
  fecha.

Lo resuelve una opción explícita (`{ ars: 'bna' }`) en `fx_service`, y se aplica
en dos lugares: `fx_provider` (precio y variación) y `tx_rates`, que con eso
convierte a USD las transacciones de activos `currency`.

Los CEDEARs y las acciones `.BA` **no cambian**: siguen convirtiendo con
`FX_ARS_SOURCE` (CCL por default), porque ese es el dólar implícito en el precio
de BYMA (ADR-0005).

## Justificación

**Por qué los proveedores y no `price_snapshots`.**

1. **Cobertura.** Un snapshot existe solo si alguien pidió el precio ese día; con
   el tráfico de una tesis, el «snapshot de ayer» muchas veces no existe y la
   variación quedaría en `null` justo cuando más se la busca.
2. **Costo cero.** CoinGecko y Yahoo devuelven la variación en la misma respuesta
   que ya pedíamos. No suma requests ni rate limit (el plan Demo de CoinGecko es
   de 30 llamadas por minuto).
3. **Es la cifra que el usuario ya conoce.** Es la misma variación que muestran
   su exchange y su broker, y así no hay dos «hoy» distintos.

**Por qué el BNA para las divisas.** Es el precio al que el usuario efectivamente
compra o vende dólares en el banco. Valuar esa operación al CCL mezcla dos
dólares en una misma posición y muestra la brecha como si fuera ganancia o
pérdida. Con el BNA de los dos lados, el costo y la valuación son coherentes: una
compra de dólares hecha hoy da P&L 0.

## Alternativas descartadas

### Último snapshot anterior a las 00:00

Ver la cobertura arriba. Además, el job de refresco (GF-221) no corre a una hora
fija, así que el «cierre» sería el último precio que pidió alguien, no un cierre.

### `regularMarketChangePercent` de Yahoo

Es el mismo número que calculamos con `regularMarketPreviousClose`. Se prefiere
calcularlo: queda explícito contra qué se compara y se valida igual que el precio.

### Cambiar `FX_ARS_SOURCE` a `oficial` para todo

Arregla las divisas pero rompe los CEDEARs: el precio en pesos de BYMA ya trae
incorporado el CCL, y convertirlo al oficial inflaría su valor en dólares.

## Consecuencias

**Positivas**

- Inicio, Activos y Groot tienen la variación del día, y queda resuelto el insumo
  de la notificación `groot.drop`.
- Comprar dólares en el banco deja de mostrar una ganancia o pérdida falsa.

**Negativas / costos asumidos**

- **«Hoy» no significa lo mismo en todos los activos.** Crypto mide 24 h móviles;
  acciones y divisas, contra la última sesión. En fin de semana, las acciones
  muestran la variación de la última sesión (la del viernes) y las divisas dan
  0 %. Es lo que muestran los brokers.
- **La variación de un CEDEAR va en pesos**, no en dólares: no incluye lo que se
  movió el CCL en el día. Es la variación que muestra BYMA.
- **Dos dólares conviven en el sistema** (CCL para `.BA`, BNA para divisas). Está
  centralizado en `fx_service` y documentado aquí, pero quien lea el código tiene
  que saberlo.
- **Las posiciones de divisas ya cargadas se recalculan solas** con el BNA. No hay
  migración porque la tasa se resuelve al leer, pero el P&L histórico de esas
  posiciones cambia respecto de lo que se mostraba antes.
- Un snapshot de otro día no aporta variación: si el proveedor falla, el precio
  cae al snapshot como siempre, pero el chip desaparece en vez de mostrar la
  variación de ayer.

## Fuera de alcance

- La notificación `groot.drop`, que ahora tiene el dato pero no el disparador.
- El segmentado 1D / 1S / 1M / 1A del gráfico de Inicio.
- Expresar la variación de los CEDEARs en dólares, descontando el movimiento del CCL.
