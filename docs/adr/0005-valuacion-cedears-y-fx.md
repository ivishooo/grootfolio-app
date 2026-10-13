# ADR-0005: Valuación de posiciones — CEDEARs por ticker propio y FX de la fecha de la operación

- **Estado:** Aceptado — 2026-10-13
- **Autores:** Ivan Otero
- **Reemplaza a:** la decisión de "FX actual" documentada en
  `docs/PLAN_MEJORAS_ACTIVOS.md` como limitación temporal del MVP.
- **Relacionado:** [ADR-0001](0001-arquitectura.md) (stack y APIs de precios).

## Contexto

Un usuario de prueba reportó que el Dashboard le mostraba **+4.109,9% de
rentabilidad en ADBE**, varios activos sin precio, y un valor total en acciones
que no se correspondía con su cartera real.

La auditoría encontró que no era un bug sino tres problemas distintos, y que el
más grave era conceptual: **GrootFolio no tenía forma de representar un CEDEAR**,
que es justamente el instrumento con el que un inversor minorista argentino
accede a acciones extranjeras. El usuario cargó el CEDEAR de Adobe —que cotiza
en pesos en BYMA— contra el ticker de Nasdaq:

| | Valor al 13/10/2026 |
|---|---|
| ADBE en Nasdaq, usado como precio actual | US$ 236,73 |
| ADBE.BA, el CEDEAR que efectivamente compró | $ 8.690 → **US$ 5,40** al CCL |

El motor hacía lo que estaba especificado: normalizaba el costo a dólares y lo
comparaba contra el precio actual. Pero estaba comparando **el precio de una
fracción contra el precio del entero**: un ratio de ~43x que se presentaba como
rentabilidad.

El problema tenía además una segunda cara. El selector de moneda del formulario
viene en USD por defecto; si el usuario no lo cambiaba y tipeaba el precio en
pesos, el error se invertía e **inflaba** la base de costo. Es decir: ni
eligiendo bien ni eligiendo mal se podía cargar un CEDEAR correctamente.

En paralelo apareció una inconsistencia independiente: Dashboard y Activos
convertían el costo al tipo de cambio del día de consulta, mientras que Reportes
ya usaba el de la fecha de la operación. La misma compra de 100 EUR valía
US$ 111,88 en una pantalla y US$ 105,24 en la otra.

## Decisión

### 1. Los CEDEARs se modelan por su propio ticker (`.BA`), no por un ratio

Un CEDEAR se carga como el activo que es —`ADBE.BA`, no `ADBE`— con su precio en
pesos. Yahoo Finance lo cotiza, el orquestador de precios lo convierte a USD con
el FX vigente, y el cálculo de rentabilidad compara peras con peras.

Para que eso sea posible y no quede librado a que el usuario conozca la
convención, se agregan tres piezas:

- **El buscador los ofrece primero y etiquetados.** Buscar "Adobe" devuelve
  `ADBE.BA — Adobe Inc. (CEDEAR)` arriba de `ADBE — Adobe Inc.`
- **Una regla de validación** (`TX_CURRENCY_MISMATCH`) rechaza cargar una acción
  que cotiza en dólares con el precio en pesos, y el mensaje de error indica cuál
  es el ticker correcto.
- **Un comando de migración** (`transactions:fix-cedears`) repunta las
  transacciones ya cargadas al ticker `.BA`, sin tocar cantidad ni precio.

### 2. La base de costo usa el tipo de cambio de la fecha de la operación

Toda conversión del costo de una operación a la moneda base pasa por un único
módulo (`services/prices/fx/tx_rates.ts`) que resuelve la tasa **de la fecha en
que se operó**, no la del día de consulta. Lo consumen los cuatro lugares que
calculan posiciones: portafolio, holdings, reportes y el detalle de usuario del
panel de administración.

Para pesos, que hasta ahora no tenían serie histórica, se incorpora
**argentinadatos.com** (CCL y oficial por fecha, desde 2015, sin API key),
respetando la misma casa de dólar que se usa para el valor del día.

## Justificación

**Por qué el ticker propio y no un ratio de conversión.** La alternativa natural
era guardar en el catálogo cuántos CEDEARs equivalen a una acción (1 ADBE ≈ 43
CEDEARs) y convertir contra el subyacente. Se descartó por tres razones
concretas:

1. **El ratio no es un dato público estable.** No hay API que lo exponga; habría
   que mantenerlo a mano, activo por activo.
2. **Cambia con cada split**, y un ratio desactualizado produce exactamente el
   mismo error que estamos arreglando, pero silencioso y más difícil de detectar.
3. **El `.BA` ya tiene precio real.** Usarlo no es una aproximación del valor del
   CEDEAR: es su cotización, con su propio spread y su propia prima respecto del
   subyacente, que es lo que el usuario efectivamente puede vender.

**Por qué rechazar en vez de intentar adivinar.** Una acción listada en Nasdaq no
tiene precio en pesos. Si el usuario pagó en pesos, compró el CEDEAR: no hay
ambigüedad que resolver, pero tampoco hay forma de distinguir ese caso de una
carga válida sin preguntarle. Rechazar con un mensaje que nombra el ticker
correcto convierte un error silencioso en una corrección de un clic.

**Por qué el FX de la fecha.** La base de costo responde a "cuánto puse", que es
un hecho del pasado y no cambia. Convertirla al dólar de hoy hace que una
posición vieja mida devaluación en vez de rentabilidad — en un país con la
inflación argentina, eso no es un detalle de precisión sino un número sin
sentido. Además, Reportes ya lo hacía así: la decisión también elimina que dos
pantallas de la misma app contesten distinto sobre la misma operación.

## Alternativas descartadas

### Ratio de conversión por activo

Guardar `metadata.cedearRatio` en el catálogo y convertir cantidad y precio
contra el subyacente. **Por qué se descarta:** mantenimiento manual, sin fuente
pública, y se rompe en cada split. Detalle arriba.

### Solo bloquear la combinación, sin modelar CEDEARs

Rechazar la carga y no hacer nada más. **Por qué se descarta:** evita el número
absurdo pero deja al usuario argentino sin poder cargar su cartera real, que es
el caso de uso principal del producto.

### Dejar el FX actual y documentar la limitación

Era la decisión vigente del MVP (`PLAN_MEJORAS_ACTIVOS.md`), que difería la
precisión temporal a una fase posterior. **Por qué se descarta ahora:** la fuente
histórica resultó ser gratuita y sin API key, el consumidor ya existía
(`getRateToUsdAt`, escrito para Reportes), y la inconsistencia entre pantallas ya
era visible para el usuario.

## Consecuencias

**Positivas**

- Un inversor argentino puede cargar su cartera real y ver rentabilidades
  correctas.
- Una sola fuente de verdad para la conversión del costo: las cuatro pantallas
  que valúan posiciones contestan lo mismo.
- La base de costo deja de moverse sola cuando se mueve el dólar.

**Negativas / costos asumidos**

- **Una dependencia externa más** (argentinadatos.com) en un sistema que ya
  depende de cinco APIs. Mitigación: ante 404 o fallo de red degrada a la tasa
  actual y lo marca `approx`, que es el comportamiento que ya existía.
- **Los datos históricos no se corrigen solos.** El comando de migración cubre el
  caso detectable; el error inverso —importes en pesos cargados como dólares— es
  indistinguible de una compra cara legítima mirando los datos, y queda para
  revisión manual.
- **El buscador gasta una consulta extra** por búsqueda de acciones, para sondear
  los `.BA` que Yahoo no devuelve en `search`. Se amortigua con el caché de 5
  minutos que ya tenía la búsqueda externa.

## Fuera de alcance de este ADR

- **Otros mercados.** La regla distingue `.BA` (pesos) del resto (dólares). Un
  CEDEAR brasileño o un listado europeo necesitarían extender el mapeo de
  mercado a moneda.
- **Detección del error inverso.** Ver arriba: necesita heurística sobre precios
  históricos de acciones, que hoy no tenemos (solo hay serie histórica de crypto).
- **Prima del CEDEAR.** No se calcula ni se muestra el desvío entre el CEDEAR y
  su subyacente, que es información útil pero es análisis, no valuación.
