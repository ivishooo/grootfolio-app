/**
 * Definicion de rutas de la API. Las rutas referenciadas como magic strings
 * (`#controllers/...`) usan lazy loading: solo se importan cuando se las
 * golpea. Mientras los controllers no existen, dejamos las rutas comentadas
 * con la story que las habilita.
 */
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

router.get('/', async () => ({ name: 'GrootFolio API', version: '0.1.0' }))

router.get('/health', async ({ response }) => {
  response.header('Cache-Control', 'no-store')
  return { status: 'ok', uptime: process.uptime() }
})

// Auth (GF-206/207/208/209). Habilitamos rutas a medida que aterrizan los
// controllers; las que aun no tienen implementacion quedan comentadas con
// el numero de story que las habilita.
router.group(() => {
  router.post('/register', '#controllers/auth_controller.register') // GF-206
  router.post('/login', '#controllers/auth_controller.login') // GF-207
  router.post('/refresh', '#controllers/auth_controller.refresh') // GF-208
  router.post('/logout', '#controllers/auth_controller.logout') // GF-208
}).prefix('/auth')

// Endpoints autenticados (requieren access token via middleware.auth()).
// Habilitamos a medida que aterrizan los controllers.
router
  .group(() => {
    router.get('/me', '#controllers/auth_controller.me') // GF-209
    router.get('/transactions', '#controllers/transactions_controller.index') // GF-212
    router.post('/transactions', '#controllers/transactions_controller.store') // GF-212
    router.patch('/transactions/:id', '#controllers/transactions_controller.update') // GF-249
    router.delete('/transactions/:id', '#controllers/transactions_controller.destroy') // GF-212
    router.delete('/assets/:assetId/transactions', '#controllers/transactions_controller.destroyByAsset') // GF-249
    router.get('/holdings', '#controllers/holdings_controller.index') // GF-213
    router.get('/portfolio', '#controllers/portfolio_controller.summary') // GF-214
    router.get('/assets/search', '#controllers/assets_controller.search') // GF-248 (autocomplete)
    router.get('/reports/transactions', '#controllers/reports_controller.transactions') // GF-250
    router.get('/reports/summary', '#controllers/reports_controller.summary') // GF-250
    router.get('/quiz', '#controllers/quiz_controller.questions') // GF-2 (perfil)
    router.post('/quiz/submit', '#controllers/quiz_controller.submit') // GF-2 (perfil)
    router.get('/quiz/result', '#controllers/quiz_controller.result') // GF-2 (perfil)
  })
  .use(middleware.auth())

// Administración (F2, Admin/Contenidos). Requiere auth + rol admin.
router
  .group(() => {
    router.get('/users', '#controllers/admin_users_controller.index')
    router.get('/users/:id', '#controllers/admin_users_controller.show')
    router.post('/users/bulk-suspend', '#controllers/admin_users_controller.bulkSuspend')
    router.post('/users/bulk-unsuspend', '#controllers/admin_users_controller.bulkUnsuspend')
    router.post('/users/:id/suspend', '#controllers/admin_users_controller.suspend')
    router.post('/users/:id/unsuspend', '#controllers/admin_users_controller.unsuspend')
    router.delete('/users/:id/avatar', '#controllers/admin_users_controller.deleteAvatar')
    router.patch('/users/:id/name', '#controllers/admin_users_controller.rename')
    router.get('/audit-logs', '#controllers/admin_audit_controller.index')
  })
  .prefix('/admin')
  .use([middleware.auth(), middleware.admin()])
