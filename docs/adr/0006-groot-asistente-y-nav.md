# ADR-0006: Groot como asistente visible y navegación única de 5 destinos

## Estado

Propuesto — 2026-11-26. Acompaña al rediseño v2 (handoff «GrootFolio v2 · web y
mobile alineadas»). Complementa al ADR-0003 (cambia el set de tabs, no la
librería) y respeta el ADR-0004 (el chat sigue sin leer la cartera).

## Contexto

La revisión UX/UI completa de `apps/web` y `apps/mobile` encontró tres problemas
de fondo:

1. **Dos apps distintas.** Web y mobile usan nombres, orden de secciones y
   colores diferentes. Mobile tiene 6 tabs; Perfil, Configuración y Admin
   compiten con las secciones de uso diario.
2. **El asistente no se ve.** El launcher genérico (un círculo naranja con un
   ícono de chat) no dice qué hace ni invita a usarlo. El chat del ADR-0004
   existe, pero se abre poco.
3. **Dos sistemas de diseño.** El asistente web tiene sus propios neutros
   (`--gf-ink*`, `--gf-line`, `--gf-bubble-*`), distintos de `packages/tokens`,
   y las pantallas usan hex sueltos (`#16A34A`, `#DC2626`, `#8B5CF6`) y el
   naranja `#F97316` como texto, que no llega a AA (2,8:1 sobre blanco).

## Decisión

1. **Navegación única.** Las secciones principales son Inicio, Activos,
   Reportes y Aprender (antes Contenidos). Las secundarias, Perfil de inversor y
   Configuración. En web van en el sidebar; en mobile, 5 tabs con «Cargar» en el
   centro (abre `AddAsset` en el stack, no es una pantalla de las tabs), y
   Perfil, Configuración y Admin pasan al menú del avatar.
2. **Groot reemplaza al launcher.** El asistente toma la forma de Groot, el gato
   de Iván: un avatar SVG animado con una burbuja proactiva que cuenta cómo
   viene el día, reacciona a lo que hace el usuario y abre el chat.
3. **La burbuja se calcula en el cliente.** El texto de la burbuja sale de una
   función pura (`grootContenido()` en `packages/shared`) con datos que la app
   ya tiene: `usePortfolio`, `useReportSummary`, `useQuizResult`,
   `useNotifications`. No pasa por el LLM ni por el endpoint del chat.
4. **Un solo set de tokens.** `packages/tokens` es la única fuente. Se agregan
   `brand.ink` (naranja para texto: `#C2410C` / `#FB923C`), `brand.tint` (hover
   y fila expandida), `trend` (ganancia/pérdida: `pos`, `neg` y sus fondos
   suaves) y `groot.ground` (círculo detrás del avatar). El preset de Tailwind
   los publica como variables CSS en `:root` y `.dark` (`text-ink-3`,
   `bg-surface`, `border-line`, `text-brand-ink`, `text-pos`, `bg-groot-ground`).

## Justificación

1. **Compatible con el ADR-0004.** El chat sigue sin acceso a la cartera: la
   burbuja de Groot no es una respuesta del modelo, es un texto armado con reglas
   fijas sobre datos que el usuario ya ve en pantalla. No hay datos personales
   nuevos saliendo hacia Gemini.
2. **Determinista y testeable.** Al ser lógica pura en `packages/shared`, cada
   modo (resumen, baja fuerte, cargado, reportes, perfil, contenido) se cubre con
   tests de vitest, incluido el umbral de baja fuerte (`-2 %`).
3. **Menos superficie en la barra de mobile.** 5 destinos entran cómodos en
   390 px con áreas táctiles de 44 px; 6 no. Lo que se usa poco (Perfil,
   Configuración, Admin) queda a un toque desde el avatar.
4. **Contraste AA sin perder la marca.** El naranja sólido (`#F97316`) se queda
   en fondos y formas; como texto pasa a `brand.ink`.

## Reglas que este ADR fija

- Groot **no recomienda** comprar ni vender: describe lo que pasó y lo compara
  con el perfil. El chat mantiene el aviso «Groot no da recomendaciones de
  inversión personalizadas.».
- Español rioplatense con voseo y sin género («Hola de nuevo»).
- El mensaje de Groot se anuncia con `aria-live="polite"` y las animaciones
  respetan `prefers-reduced-motion` / `useReducedMotion`.
- Si el usuario cierra la burbuja, no se vuelve a abrir sola ese día. Se puede
  ocultar del todo desde Configuración («Mostrar a Groot»).

## Alternativas descartadas

- **Que el LLM escriba la burbuja.** Obligaría a mandar la cartera a Gemini, que
  es justo lo que el ADR-0004 evita, y haría el texto no determinista.
- **Mantener el launcher genérico y sumar un banner en el Inicio.** Agrega otro
  componente en vez de darle identidad al que ya existe.
- **Mantener 6 tabs con scroll horizontal.** Esconde secciones y rompe la
  equivalencia con el sidebar de web.

## Consecuencias

- `AssistantLauncher` se reemplaza por `Groot` en web y en mobile. El panel del
  chat (`AssistantPanel`) se mantiene; solo cambia su header.
- `ProfileTest` y `Settings` salen de las tabs de mobile y van al stack de
  `RootNavigator`.
- Para que Groot diga la variación del día, `GET /portfolio` tiene que devolver
  `dayChangePercent` y `dayChangeAbsolute`. Mientras no esté, la burbuja dice el
  valor sin la variación.
- Los neutros propios del asistente web se borran; cualquier color nuevo entra
  por `packages/tokens`.
