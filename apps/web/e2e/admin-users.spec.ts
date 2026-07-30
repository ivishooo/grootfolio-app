import { test, expect } from '@playwright/test'
import { login } from './helpers'

const API = process.env.VITE_API_URL ?? 'http://localhost:3333'

test('admin suspende y reactiva un usuario', async ({ page, request }) => {
  // Usuario descartable para no tocar datos reales.
  const email = `e2e-suspend-${Date.now()}@grootfolio.test`
  await request.post(`${API}/auth/register`, {
    data: { email, password: 'E2ePass123!', fullName: 'E2E Suspend' },
  })

  await login(page) // dev es admin
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
  await expect(page.getByText('Solo admin')).toBeVisible()

  // Buscar el usuario descartable.
  await page.getByPlaceholder('Buscar por nombre o email…').fill(email)
  const row = page.locator('tr', { hasText: email })
  await expect(row).toBeVisible()

  // Suspender: motivo obligatorio.
  await row.getByRole('button', { name: 'Suspender' }).click()
  await page.getByPlaceholder('Queda registrado en el historial.').fill('Prueba E2E de suspensión')
  await page.getByRole('button', { name: 'Suspender cuenta' }).click()
  await expect(row.getByText('Suspendido')).toBeVisible()

  // Reactivar.
  await row.getByRole('button', { name: 'Reactivar' }).click()
  await expect(row.getByText('Activo')).toBeVisible()
})

test('la ruta admin redirige a un usuario no-admin', async ({ page, request }) => {
  const email = `e2e-user-${Date.now()}@grootfolio.test`
  await request.post(`${API}/auth/register`, {
    data: { email, password: 'E2ePass123!', fullName: 'E2E User' },
  })
  await login(page, email, 'E2ePass123!')
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/dashboard/)
})
