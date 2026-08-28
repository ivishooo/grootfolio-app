import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

const defaultOrigins = ['http://localhost:5173', 'http://localhost:8081']
const envOrigins = env.get('CORS_ORIGINS')
const origins = envOrigins ? envOrigins.split(',').map((o) => o.trim()).filter(Boolean) : defaultOrigins

const corsConfig = defineConfig({
  enabled: true,
  origin: origins,
  // PATCH es obligatorio: la API lo usa para TODA edicion parcial (perfil,
  // transacciones, usuarios, secciones, contenidos y articulos de la KB). Sin
  // el en esta lista el navegador rechaza el preflight y ninguna pantalla de
  // edicion puede guardar, aunque el endpoint funcione perfecto por curl.
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
