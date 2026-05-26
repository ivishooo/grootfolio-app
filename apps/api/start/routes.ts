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
  })
  .use(middleware.auth())

// GF-212/214/...  Resto de endpoints autenticados.
// router.group(() => {
//   router.get('/assets/catalog', '#controllers/assets_controller.catalog')
//   router.get('/portfolio', '#controllers/portfolio_controller.summary')
//   router.get('/transactions', '#controllers/portfolio_controller.listTransactions')
//   router.post('/transactions', '#controllers/portfolio_controller.createTransaction')
//   router.delete('/transactions/:id', '#controllers/portfolio_controller.deleteTransaction')
//   router.get('/quiz', '#controllers/quiz_controller.questions')
//   router.post('/quiz/submit', '#controllers/quiz_controller.submit')
//   router.get('/quiz/result', '#controllers/quiz_controller.result')
// }).use(middleware.auth())
