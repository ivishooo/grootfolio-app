import { test, expect } from '@playwright/test'
import { login } from './helpers'

const API = process.env.VITE_API_URL ?? 'http://localhost:3333'

test('cargar una compra en tres pasos lleva a Inicio', async ({ page }) => {
  await login(page)
  await page.goto('/assets/new')

  // 1 · ¿Qué activo? El buscador completa tipo y moneda (rediseño v2).
  await page.getByLabel('Nombre o ticker').fill('Bitcoin')
  await page.getByRole('option', { name: /Bitcoin/ }).first().click()
  await expect(page.getByRole('button', { name: 'Cambiar' })).toBeVisible()

  // 3 · Cantidad y precio.
  await page.getByLabel('Cantidad').fill('0.1')
  await page.getByLabel('Precio que pagaste').fill('50000')
  await page.getByLabel('Fecha de compra').fill('2026-01-15')
  const creada = page.waitForResponse((r) => r.url().endsWith('/transactions') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Guardar compra' }).click()
  const { transaction } = (await (await creada).json()) as { transaction: { id: string } }

  await expect(page).toHaveURL(/\/dashboard/)

  // Borramos la compra: si no, cada corrida le suma 0,1 BTC al usuario dev y la
  // fila de BTC en Activos (mobile) se alarga hasta que «Vender» queda fuera
  // del alcance del scroll de Maestro.
  const token = await page.evaluate(() => localStorage.getItem('gf_access_token'))
  const borrado = await page.request.delete(`${API}/transactions/${transaction.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(borrado.ok()).toBe(true)
})

test('«Vender» desde Activos abre Cargar con el activo y la venta elegidos', async ({ page }) => {
  await login(page)
  await page.goto('/assets/new?asset=BTC&kind=sell&from=assets')

  await expect(page.getByRole('button', { name: 'Cambiar' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Venta' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: 'Guardar venta' })).toBeVisible()
})
