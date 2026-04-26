# GrootFolio - Mapa Figma -> Codigo

Archivo de referencia para que cualquier colaborador (incluido Claude Code)
encuentre rapido donde se implementa cada pantalla del Figma.

**Link Figma:** https://www.figma.com/design/O6cIXsG4QHLIF8gmc9ip4T/GrootFolio---Investment-Portfolio-Manager

> Regla: al tocar una pantalla actualizar la columna "Estado" de esta tabla.

## Pantallas

| # | Frame Figma                   | Web (SPA)                                           | Mobile (Expo)                                            | Estado |
| - | ----------------------------- | --------------------------------------------------- | -------------------------------------------------------- | ------ |
| 1 | 01 - Login - Mobile / Web     | `apps/web/src/features/auth/LoginPage.tsx`          | `apps/mobile/src/screens/LoginScreen.tsx`                | Stub   |
| 2 | 02 - Dashboard                | `apps/web/src/features/dashboard/DashboardPage.tsx` | `apps/mobile/src/screens/DashboardScreen.tsx`            | Stub   |
| 3 | 03 - Add Asset                | `apps/web/src/features/assets/AddAssetPage.tsx`     | `apps/mobile/src/screens/AddAssetScreen.tsx`             | Stub   |
| 4 | 04 - Profile Test             | `apps/web/src/features/profile-test/ProfileTestPage.tsx`   | `apps/mobile/src/screens/ProfileTestScreen.tsx`    | Stub   |
| 5 | 04b - Profile Result          | `apps/web/src/features/profile-test/ProfileResultPage.tsx` | `apps/mobile/src/screens/ProfileResultScreen.tsx`  | Stub   |
| 6 | 05 - Settings (solo web)      | `apps/web/src/features/settings/SettingsPage.tsx`   | (no aplica al MVP)                                       | Stub   |

## Design tokens

Los tokens de color, tipografia, spacing y radios viven en
`packages/tokens/src/index.ts`:

- `brand` (naranja principal `#F97316`)
- `neutral` (para fondos claros/oscuros)
- `success`, `danger`, `warning`, `info`
- `lightTheme` y `darkTheme` con sub-tokens `background`, `text`, `border`,
  `brand`, `chart`.

El preset de Tailwind (para web) se consume desde `tailwind.config.ts` del
paquete web. En mobile se accede via `useTheme()` (`apps/mobile/src/theme`).

## Mock data

Mientras la API no esta lista, las pantallas consumen mocks locales:

- Web: `apps/web/src/mocks/portfolio.ts`
- Mobile: valores inline dentro de cada screen stub (`mockTotals`,
  `mockQuestions`, `mockResult`).

Cuando la API este lista, reemplazar mocks por queries de TanStack Query
apuntando al `ApiClient` de `packages/shared`.

## Convencion visual

- Radios: 10px inputs/botones, 16-18px cards, 24px hero.
- Sombras: solo en cards elevadas (tier 1 del token `shadow`).
- Iconografia: lucide-react (web) y lucide-react-native (mobile). No mezclar
  sets.
- Tipografia: Inter en web, System font stack en mobile (fallback a Inter si
  se cargan via expo-font).

## Capturas de referencia

Los PNGs exportados del Figma estan en `docs/figma/` (no se commitean
resoluciones altas; se guardan versiones optimizadas). Sirven como guia de
layout y contraste, no como spec pixel-perfect.
