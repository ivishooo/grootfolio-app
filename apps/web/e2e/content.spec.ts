import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('admin publica un enlace y el usuario lo ve en la biblioteca', async ({ page }) => {
  await login(page) // dev es admin

  const title = `E2E Guía ${Date.now()}`

  // Publicar un enlace desde el panel de admin.
  await page.goto('/admin/content')
  await page.getByRole('button', { name: '↑ Subir contenido' }).click()
  await page.getByRole('button', { name: 'Enlace' }).click()
  await page.getByPlaceholder('Ej: Guía de primeros pasos').fill(title)
  await page.getByPlaceholder('https://…').fill('https://grootfolio.app')
  await page.getByRole('button', { name: 'Publicar' }).click()
  // Esperamos el toast: garantiza que se creó el item + la notificación.
  await expect(page.getByText('Contenido publicado')).toBeVisible()

  // Aparece en la biblioteca del usuario con badge NUEVO.
  await page.goto('/content')
  await expect(page.getByText(title).first()).toBeVisible()
  await expect(page.getByText('NUEVO').first()).toBeVisible()

  // La campanita tiene notificación de contenido publicado.
  await page.getByRole('button', { name: 'Notificaciones' }).click()
  await expect(page.getByText('Nuevo contenido disponible').first()).toBeVisible()
})
