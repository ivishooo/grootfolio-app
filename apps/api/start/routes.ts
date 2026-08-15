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

// Archivos de contenidos/avatares (F3). Público por key opaca uuid, servido
// inline para <img>/<video>.
router.get('/uploads/*', '#controllers/uploads_controller.show')

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

    // Perfil propio (F3)
    router.patch('/me', '#controllers/me_controller.update')
    router.post('/me/avatar', '#controllers/me_controller.uploadAvatar')
    router.delete('/me/avatar', '#controllers/me_controller.deleteAvatar')

    // Contenidos — usuario (F3)
    router.get('/content/sections', '#controllers/content_controller.sections')
    router.get('/content/items', '#controllers/content_controller.items')
    router.post('/content/items/:id/view', '#controllers/content_controller.view')

    // Notificaciones (F3)
    router.get('/notifications', '#controllers/notifications_controller.index')
    router.post('/notifications/read-all', '#controllers/notifications_controller.readAll')
    router.post('/notifications/:id/read', '#controllers/notifications_controller.read')

    // Chatbot RAG (F4, ADR-0004)
    router.post('/chat', '#controllers/chat_controller.send')
    router.get('/chat/conversations', '#controllers/chat_controller.conversations')
    router.get('/chat/conversations/:id', '#controllers/chat_controller.messages')
    router.delete('/chat/conversations/:id', '#controllers/chat_controller.destroyConversation')
    router.post('/chat/feedback', '#controllers/chat_controller.feedback')
  })
  .use(middleware.auth())

// Administración (F2, Admin/Contenidos). Requiere auth + rol admin.
router
  .group(() => {
    router.get('/users', '#controllers/admin_users_controller.index')
    router.post('/users', '#controllers/admin_users_controller.store')
    router.get('/users/:id', '#controllers/admin_users_controller.show')
    router.patch('/users/:id', '#controllers/admin_users_controller.update')
    router.post('/users/bulk-suspend', '#controllers/admin_users_controller.bulkSuspend')
    router.post('/users/bulk-unsuspend', '#controllers/admin_users_controller.bulkUnsuspend')
    router.post('/users/:id/suspend', '#controllers/admin_users_controller.suspend')
    router.post('/users/:id/unsuspend', '#controllers/admin_users_controller.unsuspend')
    router.delete('/users/:id/avatar', '#controllers/admin_users_controller.deleteAvatar')
    router.patch('/users/:id/name', '#controllers/admin_users_controller.rename')
    router.get('/audit-logs', '#controllers/admin_audit_controller.index')

    // Contenidos — admin (F3)
    router.post('/content/sections', '#controllers/admin_content_controller.createSection')
    router.patch('/content/sections/:id', '#controllers/admin_content_controller.updateSection')
    router.delete('/content/sections/:id', '#controllers/admin_content_controller.deleteSection')
    router.get('/content/items', '#controllers/admin_content_controller.listItems')
    router.post('/content/items', '#controllers/admin_content_controller.createItem')
    router.patch('/content/items/:id', '#controllers/admin_content_controller.updateItem')
    router.delete('/content/items/:id', '#controllers/admin_content_controller.deleteItem')
    router.post('/content/items/:id/pin', '#controllers/admin_content_controller.pinItem')
    router.post('/content/items/:id/publish', '#controllers/admin_content_controller.publishItem')

    // Base de conocimiento del chatbot — admin (F2, ADR-0004)
    router.get('/kb/articles', '#controllers/kb_admin_controller.index')
    router.post('/kb/articles', '#controllers/kb_admin_controller.store')
    router.get('/kb/articles/:id', '#controllers/kb_admin_controller.show')
    router.patch('/kb/articles/:id', '#controllers/kb_admin_controller.update')
    router.delete('/kb/articles/:id', '#controllers/kb_admin_controller.destroy')
    router.post('/kb/articles/:id/publish', '#controllers/kb_admin_controller.publish')
    router.post('/kb/articles/:id/unpublish', '#controllers/kb_admin_controller.unpublish')
  })
  .prefix('/admin')
  .use([middleware.auth(), middleware.admin()])
