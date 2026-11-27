import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('completar el quiz de perfil muestra el resultado', async ({ page }) => {
  await login(page)
  // `?rehacer=1` arranca el test aunque el usuario ya tenga perfil (rediseño v2:
  // si ya hay perfil, /profile-test muestra el resultado).
  await page.goto('/profile-test?rehacer=1')

  const firstOption = page.getByTestId('quiz-option').first()
  await expect(firstOption).toBeVisible({ timeout: 15_000 })

  // Responder las 4 preguntas eligiendo la primera opcion y avanzando.
  for (let i = 0; i < 4; i++) {
    await firstOption.waitFor({ state: 'visible', timeout: 10_000 })
    await firstOption.click()
    const finalizar = page.getByRole('button', { name: 'Ver mi perfil' })
    if (await finalizar.isVisible().catch(() => false)) {
      await finalizar.click()
    } else {
      await page.getByRole('button', { name: /Siguiente/ }).click()
    }
  }

  await expect(page).toHaveURL(/\/profile-test\/result/)
  await expect(page.getByText('Tu perfil es')).toBeVisible({ timeout: 15_000 })
})
