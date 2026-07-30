import { type Page, expect } from '@playwright/test'

/** Inicia sesion con el usuario dev sembrado (admin) y espera el dashboard. */
export async function login(page: Page, email = 'dev@grootfolio.test', password = 'DevPass123!') {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  // El campo password suma un botón "Mostrar/Ocultar contraseña" (aria-label con
  // "Contraseña"), así que apuntamos al input por tipo para evitar ambigüedad.
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}
