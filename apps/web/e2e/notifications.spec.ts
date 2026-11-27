import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('la campanita lleva a la pantalla de notificaciones', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: /^Notificaciones/ }).click()
  await expect(page).toHaveURL(/\/notifications/)
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
})

test('login y registro comparten el layout nuevo', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible()
  await expect(page.getByText('Todas tus inversiones, en un solo lugar.')).toBeVisible()
  await page.getByRole('link', { name: 'Creá una gratis' }).click()
  await expect(page).toHaveURL(/\/register/)
  await expect(page.getByRole('heading', { name: 'Creá tu cuenta' })).toBeVisible()
})
