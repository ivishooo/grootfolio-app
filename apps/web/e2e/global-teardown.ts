/**
 * Teardown de la suite E2E (ISSUE-010 del pase de QA del 2026-08-26).
 *
 * La suite registra usuarios descartables y publica contenidos, y hasta ahora no
 * limpiaba nada: la base de desarrollo terminó con 27 usuarios de prueba sobre
 * 29, y los 6 items de la biblioteca de Contenidos eran todos `E2E Guía <ts>`.
 * Cualquier demo o QA visual arrancaba sobre esa basura.
 *
 * La limpieza la hace un comando del backend y no cada test, porque la API
 * expone borrado de contenidos pero **no** de usuarios: a los usuarios se los
 * suspende, con registro de auditoría, y eso es una decisión de producto que no
 * vale la pena revertir para que los tests estén cómodos.
 *
 * Es best-effort: si falla, avisa y no tumba la corrida. Un teardown que hace
 * fallar tests que pasaron sería peor que la basura que viene a limpiar.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const RAIZ_MONOREPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export default function globalTeardown() {
  try {
    const salida = execFileSync(
      'pnpm',
      ['--filter', '@grootfolio/api', 'exec', 'node', '--import=ts-node-maintained/register/esm', 'ace.js', 'db:clean-test-data', '--commit'],
      { cwd: RAIZ_MONOREPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    )
    process.stdout.write(salida)
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error)
    process.stdout.write(
      `\n[teardown] No se pudieron limpiar los datos de prueba: ${detalle}\n` +
        '[teardown] Corrélo a mano con: pnpm --filter @grootfolio/api ace db:clean-test-data --commit\n'
    )
  }
}
