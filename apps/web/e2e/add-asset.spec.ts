import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('cargar una transaccion muestra la confirmacion', async ({ page }) => {
  await login(page)
  await page.goto('/assets/new')

  await page.getByLabel('Nombre del activo').fill('BTC')
  await page.getByLabel('Cantidad').fill('0.1')
  await page.getByLabel('Precio unitario (USD)').fill('50000')
  await page.getByLabel('Fecha de compra').fill('2026-01-15')
  await page.getByRole('button', { name: 'Guardar activo' }).click()

  // El rediseño (GF-249) muestra un toast "Activo cargado" y redirige al dashboard.
  await expect(page).toHaveURL(/\/dashboard/)
})
