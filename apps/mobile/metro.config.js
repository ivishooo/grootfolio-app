/**
 * Metro config para consumir paquetes del monorepo (pnpm workspaces).
 *
 * Notas sobre pnpm:
 * - pnpm pone todos los paquetes en `node_modules/.pnpm/<pkg>@<ver>_<hash>/`
 *   y crea symlinks en los `node_modules` superficiales.
 * - Metro por default no sigue symlinks, por eso no encuentra deps
 *   transitivas como `expo-modules-core` desde adentro del paquete `expo`.
 * - Hay que activar `unstable_enableSymlinks` y `unstable_enablePackageExports`.
 */
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch del workspace root: Metro detecta cambios en packages compartidos
//    (packages/shared, packages/tokens) y refresca automaticamente.
config.watchFolders = [workspaceRoot]

// 2. Resolver paquetes desde ambos node_modules (proyecto + workspace root).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// 3. Habilitar resolucion de symlinks: critico para pnpm.
//    Sin esto, Metro falla al resolver deps transitivas como expo-modules-core.
config.resolver.unstable_enableSymlinks = true

// 4. Habilitar package exports: algunos paquetes modernos del ecosistema
//    Expo (incluyendo expo-modules-core) usan el campo "exports" del
//    package.json para exponer entry points. Sin esto, Metro no los encuentra.
config.resolver.unstable_enablePackageExports = true

module.exports = config
