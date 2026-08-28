# Tests E2E mobile (Maestro) — GF-234

Se eligió **Maestro** sobre Detox: es declarativo (YAML), no requiere build
nativo configurado ni `expo prebuild` para iterar, y funciona bien con Expo.

## Flows

| Flow | Qué cubre |
| --- | --- |
| `login.yaml` | Login del usuario dev hasta ver el Dashboard con datos. |
| `login-invalido.yaml` | Credenciales incorrectas: se queda en el login y explica el error. |
| `navegacion.yaml` | Las seis pestañas montan su pantalla. |
| `activos.yaml` | Lista de posiciones + alta y cancelación. |
| `contenidos.yaml` | Búsqueda sin resultados en la biblioteca. |
| `asistente.yaml` | La burbuja del asistente abre el panel. |
| `settings.yaml` | Perfil, toggle de tema y cierre de sesión. |

Los archivos que empiezan con `_` son subflows, no tests:

- `_abrir-app.yaml` — abre el deep link y espera a que la app cargue.
- `_cerrar-sesion.yaml` — garantiza arrancar **sin** sesión.
- `_login.yaml` — garantiza arrancar **con** sesión, parado en el Dashboard.

## Requisitos

1. **Maestro CLI**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
2. **Backend corriendo**: `docker compose up -d db` + `pnpm dev:api` (con la DB
   migrada y seedeada). En un simulador/emulador, `EXPO_PUBLIC_API_URL` debe
   apuntar a una IP accesible (la IP LAN de la máquina, o `10.0.2.2` en el
   emulador de Android; en el simulador de iOS `localhost` funciona).
3. **Metro en el puerto 8082** (el que usa `_abrir-app.yaml`):
   ```bash
   pnpm --filter @grootfolio/mobile start -- --port 8082
   ```
4. **Desactivar los gestos del dev menu de Expo Go** (una vez por simulador;
   evita que un swipe de un flow abra el menú y bloquee los taps):
   ```bash
   SIM=$(xcrun simctl list devices booted -j | python3 -c "import sys,json;d=json.load(sys.stdin)['devices'];print([x['udid'] for v in d.values() for x in v if x['state']=='Booted'][0])")
   xcrun simctl spawn $SIM defaults write host.exp.Exponent EXDevMenuTouchGestureEnabled -bool false
   xcrun simctl spawn $SIM defaults write host.exp.Exponent EXDevMenuMotionGestureEnabled -bool false
   xcrun simctl terminate $SIM host.exp.Exponent
   ```
5. **La app en un simulador/emulador**:
   - Con **Expo Go** (lo que asumen los flows hoy): `appId: host.exp.Exponent`
     y se entra por `openLink: exp://127.0.0.1:8082`.
   - Con un **dev build** (`npx expo run:ios`): cambiar `appId` a
     `com.grootfolio.app` en todos los flows y reemplazar el `openLink` de
     `_abrir-app.yaml` por `launchApp`.

## Correr

```bash
maestro test apps/mobile/.maestro/login.yaml
```

Para correr todo, pasá los flows explícitamente: `maestro test <carpeta>`
también ejecutaría los subflows `_*.yaml` como si fueran tests.

```bash
cd apps/mobile/.maestro
for f in login login-invalido navegacion activos contenidos asistente settings; do
  maestro test "$f.yaml" || echo "FALLÓ $f"
done
```

## Trampas ya pisadas (documentadas para no repetirlas)

**1. `clearState` no cierra la sesión.** Los tokens viven en
`expo-secure-store` (`src/lib/auth-storage.ts`), que en iOS es el Keychain, y
el Keychain sobrevive al borrado del contenedor de datos. Un flow que hacía
`clearState` y esperaba el formulario de login entraba derecho al Dashboard.
Por eso el arranque sin sesión lo garantiza `_cerrar-sesion.yaml`, que cierra
por la UI si detecta el tab bar.

**2. Los overlays de Expo Go se comen los taps.** Expo Go tiene dos: la hoja de
bienvenida al *developer menu* (aparece cuando arranca sin datos) y el propio
*developer menu*. Los dos son especialmente traicioneros porque **no aparecen
en la jerarquía de accesibilidad**: los `assertVisible` siguen pasando y los
`tapOn` reportan COMPLETED, pero el toque real lo recibe el overlay. El síntoma
es un flow que "hace" cosas sin que la pantalla cambie nunca.

Como Maestro no los ve, no se pueden cerrar con `runFlow ... when: visible`.
Se atacan de dos maneras:

- `_abrir-app.yaml` arranca con `stopApp`, así ningún overlay sobrevive de un
  flow al siguiente.
- Los gestos que abren el dev menu se desactivan una vez por simulador (ver
  "Requisitos", punto 5). Sin esto, un swipe de un flow puede abrirlo solo.

Y no uses `clearState`: es lo que dispara la hoja de bienvenida.

Corolario de las dos: `_abrir-app.yaml` espera con el regex
`id: 'tab-inicio|login-email'`, sin asumir si hay sesión. Antes esperaba solo
`tab-inicio`, o sea el estado logueado, y por eso era incompatible con los
flows de login.

**3. Un elemento "visible" para Maestro puede estar debajo del fold.** La
jerarquía de accesibilidad reporta elementos que están fuera del viewport, así
que `assertVisible` pasa y `tapOn` reporta COMPLETED aunque el toque caiga en
otra cosa: pasó con el toggle de tema de Ajustes, donde el tap terminaba sobre
el tab bar y cambiaba de pestaña. Para cualquier control que no entre en
pantalla, usá `scrollUntilVisible` **con `centerElement: true`** apuntando al
control en sí, no al título de su sección. Afecta a `settings-logout`,
`Cambiar tema` y al `Cancelar` del formulario de alta de activos.

**4. iOS ofrece guardar la contraseña después de un login exitoso.** El diálogo
"¿Guardar contraseña?" es del sistema y bloquea la app hasta que se responde.
A diferencia de los overlays de Expo Go, éste **sí** figura en la jerarquía, así
que se cierra con un `runFlow ... when: visible: '¿Guardar contraseña?'` que
toca "Ahora no". Está en `login.yaml` y en `_login.yaml`.

> Nota: la suite no se ejecuta en CI todavía (requiere simulador). Queda
> documentada para correrla localmente; la integración en CI con un emulador
> headless es trabajo aparte.
