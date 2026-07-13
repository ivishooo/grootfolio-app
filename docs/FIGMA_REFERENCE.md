# GrootFolio - Mapa Figma -> Codigo

Archivo de referencia para que cualquier colaborador (incluido Claude Code)
encuentre rapido donde se implementa cada pantalla.

**Link Figma:** https://www.figma.com/design/O6cIXsG4QHLIF8gmc9ip4T/GrootFolio---Investment-Portfolio-Manager

**Fuente de verdad visual del refinamiento:** `docs/design-reference/` (dentro del
repo): `.dc.html` pixel-perfect (5 pantallas web + 5 mobile, light/dark), brand
SVGs y screenshots. Ver `docs/PLAN_CLAUDE_CODE_COMPLETO.md`.

> Regla: al tocar una pantalla actualizar la columna "Estado" de esta tabla.

## Pantallas

| # | Pantalla              | Web (SPA)                                                  | Mobile (Expo)                                       | Estado |
| - | --------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ------ |
| 1 | Login                 | `apps/web/src/features/auth/LoginPage.tsx`                 | `apps/mobile/src/screens/LoginScreen.tsx`           | ✅ Done |
| 2 | Dashboard             | `apps/web/src/features/dashboard/DashboardPage.tsx`        | `apps/mobile/src/screens/DashboardScreen.tsx`       | ✅ Done |
| 3 | Cargar Activo         | `apps/web/src/features/assets/AddAssetPage.tsx`            | `apps/mobile/src/screens/AddAssetScreen.tsx`        | ✅ Done |
| 4 | Test de Perfil        | `apps/web/src/features/profile-test/ProfileTestPage.tsx`   | `apps/mobile/src/screens/ProfileTestScreen.tsx`     | ✅ Done |
| 5 | Resultado de Perfil   | `apps/web/src/features/profile-test/ProfileResultPage.tsx` | `apps/mobile/src/screens/ProfileResultScreen.tsx`   | ✅ Done |
| 6 | Settings (solo web)   | `apps/web/src/features/settings/SettingsPage.tsx`          | (no aplica al MVP)                                  | ✅ Done |
| — | Registro (solo web)   | `apps/web/src/features/auth/RegisterPage.tsx`              | (no aplica)                                         | ✅ Done |

**Estado:** integradas con la API real (auth + datos vía TanStack Query) y
refinadas (fases F1-F6): marca (logo gato), textos/voseo + taxonomía única,
accesibilidad AA, theming (colores de gráfico + persistencia), estados y
validación. Componente de marca: `apps/{web,mobile}/src/components/ui/Logo.tsx`.

## Design tokens

Los tokens de color, tipografia, spacing y radios viven en
`packages/tokens/src/index.ts`:

- `brand` (naranja principal `#F97316`)
- `neutral` (para fondos claros/oscuros)
- `success`, `danger`, `warning`, `info`
- `lightTheme` y `darkTheme` con sub-tokens `background`, `text`, `border`,
  `brand`, `chart` (series de gráfico con hues distinguibles).

El preset de Tailwind (web) se consume desde el `tailwind.config.ts` del paquete
web. En mobile se accede via `useTheme()` (`apps/mobile/src/theme`), que además
**persiste** la preferencia manual (expo-secure-store) y por default sigue el
esquema del sistema.

## Datos

Las pantallas consumen la **API real** vía TanStack Query (`apps/*/src/lib/queries.ts`)
sobre el `ApiClient` de `packages/shared`. **Ya no hay mocks** (se eliminaron en la
integración front+back). Labels de tipo de activo: fuente única
`assetTypeLabels`/`assetTypeLabel` en `packages/shared`.

## Convencion visual

- Todo color/spacing/radio/tipografía sale de `packages/tokens` (sin hex sueltos).
- Tipografia: **Inter** (web y mobile, vía `@fontsource`/`expo-font`).
- Estados: skeleton (no spinner), empty con CTA, error amigable.
- Accesibilidad: contraste AA, labels asociados, radiogroup en el test,
  `aria-label`/`aria-pressed` en botones de ícono.

## Capturas de referencia

En `docs/design-reference/screenshots/` (web 01-10, mobile 01-05) y los `.dc.html`
pixel-perfect en `docs/design-reference/screens/`. Sirven para comparar la
implementación real contra el diseño en light y dark.
