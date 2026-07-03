# EAS / Distribución iOS — setup

Andamiaje para buildear y distribuir la app en iPhone vía **TestFlight**
(épica GF-252). Este doc cubre lo que ya quedó armado en el repo y lo que
falta completar **de tu lado** (requiere cuentas Apple/Expo y el backend
desplegado).

## Ya armado en el repo

- **`eas.json`** con tres perfiles de build:
  - `development` — dev-client, simulador iOS, apunta a `http://localhost:3333`.
  - `preview` — internal distribution (device), apunta a un backend HTTPS de staging.
  - `production` — el que va a **TestFlight**; `autoIncrement` del buildNumber
    (gestionado remoto por EAS, `appVersionSource: "remote"`).
- **`app.json`**: `ios.bundleIdentifier = com.grootfolio.app` y **ATS**
  (`NSAppTransportSecurity`) forzando **HTTPS** en todo, con excepción solo
  para `localhost` (dev en simulador). El backend de preview/prod **debe** ser
  HTTPS o la app no podrá conectarse en el device.
- La app ya lee la URL del backend de `EXPO_PUBLIC_API_URL` (ver
  `src/lib/api.ts`); EAS la inyecta por perfil desde `eas.json`.

## Pendiente de tu lado (necesita credenciales)

### 1. Inicializar EAS (GF-254)
```bash
npm i -g eas-cli          # o usar npx eas-cli
eas login                 # cuenta Expo
cd apps/mobile
eas init                  # crea el projectId y reemplaza extra.eas.projectId=REPLACE_ME en app.json
```

### 2. Backend HTTPS (GF-182, bloqueante)
Reemplazar en `eas.json` los `EXPO_PUBLIC_API_URL` de `preview` y `production`
por las URLs reales del backend desplegado (Railway/Fly) con HTTPS. Sin esto la
app en el device no conecta (ATS).

### 3. App Store Connect (GF-253)
- Crear el registro de app en App Store Connect con Bundle ID `com.grootfolio.app`.
- Generar un **App Store Connect API Key** (`.p8`) y completar en `eas.json` →
  `submit.production.ios`: `ascApiKeyPath`, `ascApiKeyId`, `ascApiKeyIssuerId`.
  El `.p8` **no se commitea** (agregarlo a `.gitignore` local o guardarlo fuera del repo).

### 4. Build y submit (GF-257 / GF-258)
```bash
cd apps/mobile
eas build -p ios --profile production     # EAS gestiona cert + provisioning
eas submit -p ios --profile production    # sube a App Store Connect -> TestFlight
```
Luego, en App Store Connect → TestFlight: crear grupo de testers internos
(Ivan + Franco), agregar notas de build y enviar invitaciones. Instalás desde
la app TestFlight en el iPhone (OTA, sin cable).

> Los valores `REEMPLAZAR-*` en `eas.json` son placeholders intencionales; el
> build de `development` funciona tal cual contra la API local.
