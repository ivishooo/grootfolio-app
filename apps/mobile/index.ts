/**
 * Entry point local de la app mobile.
 *
 * Lo definimos aca (en lugar de usar el `expo/AppEntry` por defecto) porque
 * en pnpm workspaces el paquete `expo` queda en
 * `node_modules/.pnpm/expo@X.Y.Z_...../node_modules/expo/AppEntry.js`,
 * varios niveles mas profundo que en un proyecto npm normal. El
 * `import App from '../../App'` hardcodeado en el AppEntry de Expo no
 * resuelve a nuestro `App.tsx` real, lo cual rompe el bundle al iniciar.
 *
 * Definiendo este entry local, `./App` resuelve contra esta carpeta y
 * todo funciona limpio. Es el patron oficial recomendado para Expo en
 * pnpm monorepos.
 */
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
