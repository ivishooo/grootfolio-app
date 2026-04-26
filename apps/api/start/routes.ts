/**
 * Definicion de rutas de la API. Este archivo actua como referencia
 * del contrato. La implementacion real de cada controlador se suma
 * en la Fase 2 del plan (ver docs/CLAUDE_CODE_PLAN.md).
 */

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

router.get('/', async () => ({ name: 'GrootFolio API', version: '0.1.0' }))

router.group(() => {
  router.post('/register', '#controllers/auth_controller.register')
  router.post('/login', '#controllers/auth_controller.login')
  router.post('/refresh', '#controllers/auth_controller.refresh')
  router.post('/logout', '#controllers/auth_controller.logout')
}).prefix('/auth')

router.group(() => {
  router.get('/me', '#controllers/auth_controller.me')
  router.get('/assets/catalog', '#controllers/assets_controller.catalog')
  router.get('/portfolio', '#controllers/portfolio_controller.summary')
  router.get('/transactions', '#controllers/portfolio_controller.listTransactions')
  router.post('/transactions', '#controllers/portfolio_controller.createTransaction')
  router.delete('/transactions/:id', '#controllers/portfolio_controller.deleteTransaction')
  router.get('/quiz', '#controllers/quiz_controller.questions')
  router.post('/quiz/submit', '#controllers/quiz_controller.submit')
  router.get('/quiz/result', '#controllers/quiz_controller.result')
}).use(middleware.auth())
