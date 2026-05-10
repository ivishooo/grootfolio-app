import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

const defaultOrigins = ['http://localhost:5173', 'http://localhost:8081']
const envOrigins = env.get('CORS_ORIGINS')
const origins = envOrigins ? envOrigins.split(',').map((o) => o.trim()).filter(Boolean) : defaultOrigins

const corsConfig = defineConfig({
  enabled: true,
  origin: origins,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
