# ADR-0002: Upgrade Expo SDK 51 -> 54

- **Estado:** Aceptado
- **Fecha:** 2026-04-28
- **Autores:** Ivan Otero
- **Reemplaza a:** Pin de SDK del ADR-0001 (sub-decision de "React Native con Expo SDK estable")
- **Reemplazado por:** -

## Contexto

El ADR-0001 fijo "React Native con Expo SDK estable" como decision de stack
mobile. Al momento de redactar el ADR (abril 2026), interpretamos "estable" como
**Expo SDK 51** y pinneamos las dependencias acordemente:

- `expo: ~51.0.39`
- `react-native: 0.74.5`
- `react: 18.2.0`
- `@types/react: ~18.2.79`

Al validar la app en un dispositivo iOS fisico por primera vez (cierre de la
subtarea 16 de la Fase 1 del CLAUDE_CODE_PLAN), Expo Go reporto el siguiente
error:

```
Project is incompatible with this version of Expo Go
- The installed version of Expo Go is for SDK 54.0.0.
- The project you opened uses SDK 51.
```

El motivo: Apple no permite instalar versiones anteriores de Expo Go en iOS (App
Store solo expone la ultima version publicada). Para todo iPhone que se baje
Expo Go nuevo, el unico SDK que va a poder correr la app es el publicado en App
Store al momento de la instalacion. Esto afecta:

- A nosotros para validar en device real durante el desarrollo.
- Al uso de Expo Go para revisiones puntuales con el resto del equipo o tutor.
- A futuros testers que quieran probar la app en un device nuevo.

La alternativa de quedarse en SDK 51 implicaba forzar uso de iOS Simulator
(con Xcode 50GB+ instalado) para todas las validaciones mobile. Eso degrada
la experiencia de desarrollo y la fidelidad del testing.

## Decision

Migrar el monorepo completo a **Expo SDK 54**, alineando todas las dependencias
mobile y web compatibles. Especificamente:

### Mobile (`apps/mobile/`)

Versiones finales tras `npx expo install --fix`:

- `expo: ~51.0.39` -> `~54.0.0`
- `react-native: 0.74.5` -> `0.81.5`
- `react: 18.2.0` -> `^19.1.0`
- `@types/react: ~18.2.79` -> `^19.1.17`
- `expo-secure-store: ~13.0.2` -> `^15.0.8`
- `expo-status-bar: ~1.12.1` -> `^3.0.9`
- `expo-font: ~12.0.10` -> `^14.0.11`
- `expo-splash-screen: ~0.27.7` -> `^31.0.13`
- `@react-navigation/native: ^6.1.18` -> `^7.0.0`
- `@react-navigation/native-stack: ^6.11.0` -> `^7.0.0`
- `react-native-safe-area-context: 4.10.5` -> `^5.6.2`
- `react-native-screens: 3.31.1` -> `^4.16.0`
- `react-native-svg: 15.2.0` -> `^15.12.1`
- `victory-native: ^36.9.2` -> `^41.0.0` (vuelve a la rama Skia que requeria
  RN 0.78+ y React 19; ahora si calza con RN 0.81)
- `jest-expo: ~51.0.4` -> `~54.0.17`
- `@expo-google-fonts/inter: ^0.2.3` -> `^0.4.0`

Los pins de paquetes secundarios se obtuvieron via `npx expo install --check
--fix`, que es el flujo oficial de Expo para upgrades de SDK: detecta los
paquetes expo-aware en el `package.json`, consulta el manifest de versiones
del SDK instalado, y actualiza los pins a las versiones exactas que cada SDK
garantiza compatibles entre si.

### Web (`apps/web/`)

- `react: ^18.3.1` -> `^19.1.0`
- `react-dom: ^18.3.1` -> `^19.1.0`
- `@types/react: ^18.3.11` -> `^19.1.0`
- `@types/react-dom: ^18.3.0` -> `^19.1.0`
- `@testing-library/react: ^16.0.1` -> `^16.1.0` (compat con React 19)
- `react-router-dom: ^6.27.0` -> `^7.0.0` (react-router 6 tiene tipos
  ligados a React 18; al bumpear React, JSX.Element infiere distinto y
  TS2786 marca todos los componentes del router. v7 soporta React 19 con
  API casi identica para nuestros usos basicos -- Routes, Route, NavLink,
  Outlet, useNavigate, useLocation funcionan sin cambios).

### Infra y entorno

- `.nvmrc`: `20.11` -> `20.19.4`. SDK 54 + RN 0.81 + Metro 0.83 requieren
  Node `>=20.19.4` (los warnings de EBADENGINE de `npx expo install` lo
  confirmaron al intentar correr con Node 20.11).
- `package.json` raiz: campo `engines.node` actualizado a `>=20.19.4`.
- `package.json` raiz: campo `pnpm.overrides` agregado para forzar una unica
  major de `react`, `react-dom`, `@types/react` y `@types/react-dom` (`^19.0.0`)
  en todo el monorepo (workspaces + transitivas). Razon: durante el upgrade,
  pnpm resolvio React a versiones distintas en mobile y web por el juego de
  peer-deps con react-dom@19.2.5 latest; los tipos terminaron mismatched y el
  typecheck de web fallo con TS2786. Pinear via overrides garantiza un solo
  set de versiones React, lo cual ademas es buena practica en monorepos para
  evitar bugs sutiles de runtime cuando dos copias de React conviven.
- `.github/dependabot.yml`: comentario actualizado al nuevo pin (las reglas
  estructurales se mantienen).

## Alternativas consideradas

### Mantener SDK 51 + usar iOS Simulator

- **Pros:** sin migracion. Documentacion existente sigue valida. Cero riesgo
  de breaking changes inducidos por React 19 / RN 0.81.
- **Contras:** Xcode pesa ~50GB de descarga inicial; Simulator es mas lento
  que un device real; no podemos validar en celulares fisicos del equipo o
  testers; SDK 51 alcanza end-of-life eventualmente y nos vamos a tener que
  mover en algun momento, mas dificil cuanto mas codigo de producto haya.
- **Por que se descarta:** la friccion diaria de no poder usar Expo Go en
  device fisico supera el costo unico de migrar ahora cuando el codebase
  todavia es scaffolding.

### Migrar a SDK 55 (latest en npm)

Durante la ejecucion de esta migracion intentamos saltar directamente a SDK 55
(que es el latest publicado en npm al momento del trabajo). El intento fallo:
**SDK 55 no estaba todavia publicado en App Store de iOS**. Apple expone solo
la ultima version aprobada de Expo Go, que en abril 2026 era 54.0.2 (publicada
~7 meses antes). El error que aparecio fue el reciproco del original:

```
Project is incompatible with this version of Expo Go
The project you requested requires a newer version of Expo Go.
Download the latest version of Expo Go from the App Store.
```

Pero en el App Store la "latest" sigue siendo 54.0.2 (no hay 55). npm publica
los SDK apenas estan estables tecnicamente; App Store agrega review de Apple
que demora semanas/meses. Por eso se replego a SDK 54: es el mas reciente
*efectivamente disponible* en device fisico iOS.

- **Por que se descarta SDK 55 por ahora:** App Store no expone Expo Go 55
  todavia, asi que no podemos validar en celular sin armar un development
  build custom (over-engineering para esta etapa).
- **Cuando re-evaluar:** cuando Apple publique Expo Go 55 (o superior), abrir
  un ADR-000X para subir el pin. La transicion deberia ser barata por estar
  ya en SDK 54 / RN 0.81 / React 19, no SDK 51 / RN 0.74 / React 18.

### Posponer la migracion

- **Pros:** seguir Fase 1 sin interrupcion.
- **Contras:** la deuda crece con cada PR de Fase 1+; cuando lleguemos a
  Fase 3 (pantallas con datos mock) el surface es mucho mayor y la migracion
  duele mas; mientras tanto, no podemos validar en device real.
- **Por que se descarta:** estamos en el momento de menor costo posible para
  esta migracion (scaffolding + 2 PRs de Fase 1 sin mergear todavia). Cualquier
  retraso aumenta el costo.

## Consecuencias

### Positivas

- Validacion mobile en device fisico via Expo Go (App Store) sin friccion.
- Alineacion con el ecosistema disponible al momento del trabajo de tesis:
  React 19.1, RN 0.81, victory-native v41 (Skia-based, mas performante),
  React Navigation 7.
- victory-native v41 que originalmente queriamos pero tuvimos que bajar a v36
  por compat de RN 0.74. Ahora podemos usar la version Skia con buen rendimiento.
- Defensa de tesis: muestra un proceso de revisar y ajustar decisiones tecnicas
  cuando aparece evidencia nueva, no rigidez con la decision inicial. Tambien
  evidencia la diferencia entre "latest en npm" y "latest disponible en
  consumidores reales" como factor de decision tecnica.

### Negativas / riesgos

- **React 19 puede romper algun codigo TypeScript** que dependiera de
  comportamiento de tipos de React 18. Mitigado: el codebase actual tiene poco
  codigo (stubs de pantallas + un par de hooks). Cualquier issue se ataja en
  el typecheck de este mismo PR.
- **React Navigation 7 cambio API en algunos lados** (typing, configs de
  screens). Mitigado: nuestro `RootNavigator` es chico (5 screens stub).
- **El lockfile va a regenerar drasticamente** porque cambian peer deps en
  cascada. Esperado, no requiere accion mas alla de commitear el nuevo lock.
- **react-router-dom subio a v7**. Cambios de API menores; nuestro uso (Routes,
  Route, NavLink, Outlet, useNavigate, useLocation) sobrevive sin cambios.

### Cambios documentales acompanantes

Junto a este ADR se actualizan:

- `docs/adr/0001-arquitectura.md`: nota de supersesion sobre el pin de SDK.
- `docs/ONBOARDING.md`: las menciones a SDK 51 / RN 0.74 / React 18 se
  actualizan al stack nuevo.
- `README.md`: el bloque de stack se ajusta a React 19 / SDK 54 / RN 0.81.
- `CLAUDE.md`: idem.
- `.github/dependabot.yml`: las reglas de ignore se ajustan al nuevo pin.

## Plan de migracion (referenciado)

1. Crear branch `chore/upgrade-expo-sdk-54` desde `develop` (hecho).
2. Cambiar `expo` pin a `~54.0.0` en `apps/mobile/package.json`.
3. `pnpm install` para regenerar lockfile (puede traer peer warnings).
4. `cd apps/mobile && npx expo install --fix` para que la CLI alinee todos
   los paquetes expo-aware a las versiones exactas que SDK 54 recomienda.
5. `cd ../.. && pnpm install` para volver a lockear con los pins ajustados.
6. Validar `pnpm typecheck && pnpm lint && pnpm build`.
7. Validar runtime en device fisico (Expo Go SDK 54 corre el proyecto OK).
8. Mergear a develop con bypass de Repository admin.
9. Rebasear la branch `feature/design-system` (que tiene WIP de Fase 1) sobre
   develop. Ajustar manualmente los pins de fonts mobile que quedaron viejos
   en ese commit (expo-font 12 -> 14, expo-splash-screen 0.27 -> 31,
   @expo-google-fonts/inter 0.2 -> 0.4).
10. Continuar con Fase 1 a partir de la subtarea 17.

## Revision futura

- Cuando Apple publique Expo Go 55+ en App Store, evaluar la siguiente
  migracion. Si la fase activa del proyecto lo permite (entre fases de
  implementacion, no en medio de una), hacerlo en cuanto el SDK siguiente
  alcance estabilidad documentada Y este disponible en App Store.
- Si en el futuro decidimos congelar el SDK por mas de un ciclo (ej: durante
  un sprint de cierre antes de la entrega final), documentarlo en un ADR-000X
  para no quedar a la deriva del ecosistema sin intencion explicita.
