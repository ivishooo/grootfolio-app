# Tests E2E mobile (Maestro) — GF-234

Se eligió **Maestro** sobre Detox: es declarativo (YAML), no requiere build
nativo configurado ni `expo prebuild` para iterar, y funciona bien con Expo.

## Flujo

- `login.yaml`: login con el usuario dev → dashboard. Usa los `testID`
  `login-email`, `login-password`, `login-submit` y verifica el título
  "Dashboard".

## Requisitos

1. **Maestro CLI**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
2. **Backend corriendo** (`pnpm dev:api` + DB migrada y seedeada). En un
   simulador/emulador, `EXPO_PUBLIC_API_URL` debe apuntar a una IP accesible
   (la IP LAN de la máquina, o `10.0.2.2` en el emulador de Android; en el
   simulador de iOS `localhost` funciona).
3. **La app en un simulador/emulador**:
   - Dev build (recomendado para Maestro): `npx expo run:ios` (o `run:android`).
     El `appId` es `com.grootfolio.app` (el del `login.yaml`).
   - Con **Expo Go**: cambiar `appId` a `host.exp.Exponent` y abrir el proyecto
     en Expo Go antes de correr el flujo.

## Correr

```bash
maestro test apps/mobile/.maestro/login.yaml
# o todos:
maestro test apps/mobile/.maestro
```

> Nota: este flujo no se ejecuta en CI todavía (requiere simulador). Queda
> documentado para correrlo localmente; la integración en CI con un emulador
> headless es trabajo aparte.
