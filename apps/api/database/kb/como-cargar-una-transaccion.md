---
title: Cargar, editar y borrar transacciones
slug: como-cargar-una-transaccion
status: published
---

Una **transacción** es cada compra o venta individual que registrás en
GrootFolio. Es la unidad mínima del sistema: tu portafolio no se carga
"posición por posición", se arma solo a partir de las operaciones que vas
cargando.

## Dónde se carga una operación

En la web, entrá a **Activos** y tocá el botón **Cargar activo**. En la
aplicación móvil, el mismo formulario está en la pestaña **Activos**, con el
botón de agregar.

El formulario sirve tanto para compras como para ventas: no hay dos pantallas
distintas, se elige el tipo de operación adentro del mismo formulario.

## Qué datos necesito para registrar una operación

El formulario **Cargar activo** te pide:

- **Tipo de activo**: cripto, acción, bono o divisa. Filtra el buscador de
  activos.
- **Activo**: se busca por símbolo o por nombre sobre el catálogo de
  GrootFolio (por ejemplo `BTC`, `AAPL`, `GGAL.BA`).
- **Operación**: compra o venta.
- **Cantidad**: cuántas unidades operaste. Admite decimales, que es lo normal
  en cripto.
- **Precio unitario**: a cuánto pagaste (o cobraste) cada unidad.
- **Moneda del precio**: la moneda en la que está expresado ese precio unitario
  (por ejemplo USD o ARS). Es un campo aparte del activo, porque podés comprar
  el mismo activo en monedas distintas.
- **Comisión**: lo que te cobró el broker o el exchange. Es opcional; si no la
  cargás, se toma como cero.
- **Fecha de compra**: cuándo se hizo la operación. Importa para el orden del
  historial y para los reportes.
- **Notas**: texto libre y opcional, por si querés dejarte una referencia.

Mientras completás los campos, el bloque **Resumen** te muestra el total
estimado de la operación antes de confirmarla.

## ¿Puedo cargar ventas o solamente compras?

Podés cargar las dos. En el campo **Operación** elegís entre compra y venta, y
cada una se guarda como una transacción distinta del mismo activo.

Las ventas no borran nada: se suman al historial y reducen la cantidad que te
queda en esa posición. Además, son las que generan el **P&L realizado** que vas
a ver en la sección Reportes. Si vendés todo lo que tenías de un activo, la
posición se cierra y deja de aparecer en el listado de tenencias, pero las
operaciones siguen en el ledger de Reportes.

## Qué tipo de cambio se usa para calcular el costo

Si cargaste una operación en una moneda distinta del dólar, GrootFolio la
convierte a dólares, porque toda la valuación del portafolio está en dólares.
Hay dos criterios distintos según dónde estés mirando, y conviene saberlo:

- **En el Dashboard y en tus tenencias**, el costo se convierte a dólares con
  el **tipo de cambio actual**. Es decir: el precio unitario y la comisión que
  cargaste se multiplican por la cotización de hoy de esa moneda.
- **En los Reportes**, cada operación se valúa con el **tipo de cambio de la
  fecha en la que se hizo**. Cuando no se consigue la cotización exacta de ese
  día, la operación queda marcada como **FX aproximado** en la columna
  correspondiente del ledger.

Por eso el mismo conjunto de operaciones puede mostrar un costo levemente
distinto en el Dashboard y en el ledger de Reportes: no es un error de cálculo,
son dos preguntas distintas. El Dashboard responde "cuánto vale hoy lo que
tengo"; el reporte responde "qué pasó en cada operación, en su momento".

Las cotizaciones de divisas se toman de un proveedor externo de tipos de
cambio, igual que los precios de los activos.

## Por qué mi portafolio se muestra en dólares si compré en pesos

Porque GrootFolio usa el **dólar como moneda base** para todo el portafolio.

La razón es que una cartera puede mezclar cripto, acciones argentinas, acciones
estadounidenses, bonos y divisas, cada uno cotizando en su propia moneda. Sumar
todo eso sin una moneda común no daría un número comparable: el "total" sería
una suma de unidades distintas.

Al normalizar a dólares, el valor total, la ganancia y la distribución de tu
cartera son consistentes entre sí y comparables en el tiempo. Podés seguir
cargando las operaciones en la moneda en que las hiciste: la conversión es
interna y no te cambia lo que registraste.

## Cómo edito una operación que cargué mal

En la pantalla **Activos**, expandí el activo para ver el detalle de sus
transacciones y editá la que necesites. Podés corregir la cantidad, la moneda
del precio, la comisión, la fecha de compra y las notas.

Apenas guardás el cambio, la posición se recalcula sola: no hay que rehacer
nada más. Como el portafolio se deriva de las transacciones, corregir el dato de
origen alcanza para que el Dashboard, las tenencias y los reportes queden bien.

## Si borro una operación, ¿qué pasa con la posición?

La posición se vuelve a calcular sin esa operación.

- Si borrás **una de varias** operaciones de un activo, la cantidad y el precio
  promedio se recalculan con las que quedan.
- Si borrás **la última operación** que te quedaba de ese activo, la posición
  queda en cero y el activo desaparece del listado de tenencias y del
  Dashboard. No queda una posición "vacía" dando vueltas.

También podés borrar de una sola vez todas las transacciones de un activo, lo
que equivale a sacarlo por completo de tu portafolio.

## Cómo impactan las comisiones

La comisión de una **compra** se suma al costo de la posición: forma parte de
lo que realmente te salió comprar, así que afecta el precio promedio y, por lo
tanto, el resultado que ves.

La comisión de una **venta** no modifica el precio promedio de lo que te queda:
esa parte de la posición ya estaba valuada antes de vender.
