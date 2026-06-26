import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('completar el quiz de perfil muestra el resultado', async ({ page }) => {
  await login(page)
  await page.goto('/profile-test')

  const retake = page.getByRole('button', { name: 'Volver a hacer el test' })
  const firstOption = page.getByTestId('quiz-option').first()

  // Esperar a que la pantalla termine de cargar: o el resumen (ya tiene perfil)
  // o el formulario.
  await expect(retake.or(firstOption)).toBeVisible({ timeout: 15_000 })
  if (await retake.isVisible()) await retake.click()

  // Responder las 4 preguntas eligiendo la primera opcion y avanzando.
  for (let i = 0; i < 4; i++) {
    await firstOption.waitFor({ state: 'visible', timeout: 10_000 })
    await firstOption.click()
    const finalizar = page.getByRole('button', { name: 'Finalizar' })
    if (await finalizar.isVisible().catch(() => false)) {
      await finalizar.click()
    } else {
      await page.getByRole('button', { name: /Siguiente/ }).click()
    }
  }

  await expect(page).toHaveURL(/\/profile-test\/result/)
  await expect(page.getByText('Tu perfil de inversor es...')).toBeVisible({ timeout: 15_000 })
})
