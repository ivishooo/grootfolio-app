import { test, expect } from '@playwright/test'
import { login } from './helpers'

/**
 * Groot y la navegación del rediseño v2 (Fase 7). Cada test arranca con un
 * contexto limpio, así que la burbuja no está «cerrada hoy».
 */

test('tocar a Groot cambia el mensaje', async ({ page }) => {
  await login(page)
  const avatar = page.getByRole('button', { name: 'Groot: tocalo para otro mensaje' })
  const bubble = page.getByRole('status').filter({ hasText: 'Groot' })
  const msg = bubble.locator('p[aria-live]')

  // En Inicio la burbuja abre sola con el resumen del día.
  await expect(bubble.getByText('tu día')).toBeVisible()

  await avatar.click()
  await expect(bubble.getByText('te dice')).toBeVisible()
  const primero = (await msg.textContent())?.trim()
  expect(primero).toBeTruthy()

  await avatar.click()
  await expect(msg).not.toHaveText(primero!)
})

test('«Preguntarme algo» abre el chat y Groot se oculta', async ({ page }) => {
  await login(page)
  const bubble = page.getByRole('status').filter({ hasText: 'Groot' })
  await bubble.getByRole('button', { name: 'Preguntarme algo' }).click()
  await expect(page.getByRole('dialog', { name: 'Chat con Groot' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Groot: tocalo para otro mensaje' })).toBeHidden()
})

test('cerrar la burbuja la deja cerrada al volver a Inicio', async ({ page }) => {
  await login(page)
  const bubble = page.getByRole('status').filter({ hasText: 'Groot' })
  await bubble.getByRole('button', { name: 'Ocultar a Groot' }).click()
  await expect(bubble).toBeHidden()
  const nav = page.getByRole('complementary', { name: 'Navegación principal' })
  await nav.getByRole('link', { name: 'Activos' }).click()
  await nav.getByRole('link', { name: 'Inicio' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(bubble).toBeHidden()
})

test('la sidebar navega Inicio, Activos, Reportes y Aprender', async ({ page }) => {
  await login(page)
  const nav = page.getByRole('complementary', { name: 'Navegación principal' })
  const destinos: Array<[string, RegExp, string]> = [
    ['Activos', /\/assets$/, 'Activos'],
    ['Reportes', /\/reports/, 'Reportes'],
    ['Aprender', /\/content/, 'Aprender'],
    ['Inicio', /\/dashboard/, 'Inicio'],
  ]
  for (const [link, url, heading] of destinos) {
    // «Aprender» suma «N sin leer» al nombre si hay material nuevo.
    const item = nav.getByRole('link', { name: new RegExp(`^${link}`) })
    await item.click()
    await expect(page).toHaveURL(url)
    await expect(item).toHaveAttribute('aria-current', 'page')
    if (heading !== 'Inicio') await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  }
})
