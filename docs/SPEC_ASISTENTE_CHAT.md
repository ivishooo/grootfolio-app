# Rediseño del asistente de chat · GrootFolio
Spec de implementación para Claude Code. Referencia visual: `design-reference/screens/Asistente GrootFolio.dc.html`.

---

## 1. Diagnóstico de la ventana actual

| # | Problema | Detalle |
|---|---|---|
| 01 | Jerarquía | El panel nace abierto, sin overlay ni sombra clara, y se solapa con las tarjetas de KPI ("Mejor Activo"). Se lee como un bug, no como una capa. |
| 02 | Identidad | "Asistente" sin avatar, sin nombre de producto y sin señal de disponibilidad. El header no se separa del cuerpo. |
| 03 | Estado vacío | ~600 px de aire muerto. El mensaje de bienvenida es un párrafo suelto y las sugerencias flotan sin agrupar. |
| 04 | Affordance | "Enviar" en naranja al 40 % parece deshabilitado. El input no crece, no hay hint de teclado. |
| 05 | Confianza | Promete "no inventar" pero no muestra fuentes ni permite calificar la respuesta. Sin forma de medir calidad. |
| 06 | Continuidad | Al cerrar se pierde la conversación: sin historial, sin launcher para volver, sin memoria de scroll. |

---

## 2. Tokens

```css
:root {
  --gf-accent:#F97316;        /* launcher, burbuja usuario, enviar activo */
  --gf-accent-hover:#EA580C;
  --gf-accent-soft:#FFF1E7;   /* avatar, chips, item activo del historial */
  --gf-ink:#14161A;
  --gf-ink-2:#4B5259;
  --gf-ink-3:#8A9199;
  --gf-line:#F0EEE9;          /* divisores internos */
  --gf-border:#EAE7E1;        /* borde del panel */
  --gf-bubble-bot:#F7F6F4;    /* + borde #EFEDE8 */
  --gf-ok:#16A34A;
  --gf-err:#DC2626;

  --gf-panel-w:400px;
  --gf-panel-h:640px;         /* máx 88vh; full-screen < 640px */
  --gf-r-panel:18px;
  --gf-r-bubble:16px;
  --gf-r-composer:14px;
  --gf-r-icon:11px;
  --gf-shadow:0 30px 60px -30px rgba(20,22,26,.35),
              0 2px 6px -2px rgba(20,22,26,.08);
}
```

Tipografía: mensaje 14 px · meta y estado 12 px · disclaimer y labels 10.5 px.

Modo oscuro (`.dark`): panel `#17191D`, burbuja bot `#21242A`, borde `#2C3037`, acento igual.

### Reglas duras
- Sombra + overlay `rgba(20,22,26,.06)` cuando el panel está abierto: la capa se lee como capa.
- Nunca dos naranjas compitiendo: burbuja del usuario naranja, todo lo demás neutro.
- Hit targets ≥ 44 px en móvil (íconos del header con padding, no solo 30 px).
- Texto del mensaje ≥ 14 px, nunca gris claro sobre blanco.
- Composer: máximo 5 líneas, después scroll interno.

---

## 3. Estados

**Cerrado** — launcher fijo de 60 px abajo a la derecha, punto de estado verde, teaser proactivo opcional (burbuja oscura descartable).

**Bienvenida** — header con avatar + estado; saludo con nombre; aclaración de alcance ("si algo no está documentado te lo digo, no lo invento"); label "Empezá por acá" + 3 tarjetas de sugerencia con ícono, título y subtítulo de qué va a pasar; composer con placeholder y disclaimer.

**Conversación** — separador de fecha/hora; burbuja de usuario naranja alineada a la derecha; respuesta del asistente con avatar, bloque de datos del portafolio opcional, chips de fuente y fila de acciones (copiar, reintentar, 👍/👎); indicador de escritura de 3 puntos; chips de seguimiento sobre el composer.

**Ampliado** — modal centrado de 820 × 560 px con rail de historial a la izquierda (240 px): botón "Nueva conversación" + lista de recientes. Mismo componente, otro layout.

**Móvil (< 640 px)** — full-screen con `env(safe-area-inset-bottom)`.

---

## 4. Estructura de archivos

```
components/assistant/
  AssistantLauncher
  AssistantPanel      · shell + header
  MessageList         · scroll + autoscroll
  MessageBubble       · user | bot | error
  SourceChips
  MessageActions
  SuggestionCards
  Composer            · textarea autogrow
  TypingDots
  useAssistantChat.ts · estado + fetch
```

Panel tonto, hook único: `isOpen`, `isExpanded`, `messages`, `status` (`idle | streaming | error`).
- Persistir `messages` + `isOpen` en localStorage por usuario.
- Autoscroll solo si el usuario ya estaba al fondo (< 80 px de distancia).
- `AbortController` para "Detener" durante el streaming.

---

## 5. Contrato de API

```
POST /api/assistant/chat
  body: { message, conversationId }
  res:  text/event-stream
        event: token   → { delta }
        event: data    → { portfolioBlock }
        event: sources → [{ id, title, type }]
        event: done    → { messageId }

GET  /api/assistant/conversations
POST /api/assistant/feedback
  body: { messageId, vote, comment? }
```

---

## 6. Accesibilidad
- Panel: `role="dialog"`; `aria-modal` solo en ampliado y móvil.
- Lista: `role="log"` + `aria-live="polite"`; cada mensaje anuncia autor.
- Esc cierra y devuelve el foco al launcher; foco atrapado en el modal.
- Focus ring naranja al 25 % en composer, chips y botones.
- Respetar `prefers-reduced-motion` (sin animación de entrada ni pulse).

---

## 7. Orden de trabajo

> **Estado de implementación** (2026-08-13): PR 1 a 5 hechos, con dos
> desviaciones deliberadas que quedan como decisiones de producto:
>
> - **El asistente no lee el portafolio.** El spec lo propone en la bienvenida,
>   el header y el `portfolioBlock`, pero contradice el ADR-0004 y el system
>   prompt de F4, donde tiene prohibido hablar de las tenencias del usuario.
>   Prometer en la UI algo que el bot va a rechazar es peor que no prometerlo.
> - **Sin streaming SSE.** Rehacer `POST /chat` como `text/event-stream` cambia
>   el contrato en web, mobile y el harness de `kb:eval`. Hoy la respuesta llega
>   completa y el indicador de escritura cubre la espera.
>
> El endpoint es `POST /chat` (+ `/chat/feedback`, `/chat/conversations`), no
> `/api/assistant/*`: el proyecto no usa prefijo `/api`.

1. **PR 1 — Shell + launcher.** Tokens CSS, launcher, overlay, animación de apertura, cierre con Esc, panel arranca cerrado. Sin tocar la lógica de chat.
2. **PR 2 — Header, burbujas y composer.** Avatar, estado, textarea autogrow, Enter / Shift+Enter, botón enviar con estados real / disabled / streaming.
3. **PR 3 — Bienvenida + sugerencias.** Tarjetas que precargan el prompt y lo envían; disclaimer fijo en el footer.
4. **PR 4 — Streaming, fuentes y feedback.** SSE token a token, chips de fuente que abren la Base de conocimiento, copiar / reintentar / 👍👎, estado de error con reintento.
5. **PR 5 — Persistencia, historial y vista ampliada.** localStorage + endpoint de conversaciones, rail lateral, modal 820 px, full-screen en móvil, modo oscuro.

### Checklist de QA
- El panel abierto no tapa ninguna tarjeta de KPI en 1280 px.
- Respuesta larga: scroll suave, header y composer fijos.
- Sin conexión: mensaje de error con "Reintentar", no spinner infinito.
- Recargar la página: la conversación sigue ahí y el panel recuerda si estaba abierto.
- Solo teclado: abrir, escribir, enviar, cerrar y volver al launcher.
- Móvil 375 px: full-screen, el teclado no tapa el input.
- Modo oscuro: contraste AA en burbujas y disclaimer.

---

## 8. Prompt inicial para Claude Code

> Rediseñá el widget del asistente siguiendo este spec. Empezá por el PR 1: extraé el componente actual a `components/assistant/*`, agregá los tokens `--gf-*`, el launcher fijo abajo a la derecha y que el panel arranque cerrado. No cambies el endpoint todavía. Mostrame el diff antes de seguir con el PR 2.

---

## 9. Referencia HTML/CSS

El markup y CSS completos (launcher, panel, header, burbujas, fuentes, acciones, typing, composer, responsive) están en la sección **Referencia HTML + CSS** de
`design-reference/screens/Asistente GrootFolio.dc.html`.
