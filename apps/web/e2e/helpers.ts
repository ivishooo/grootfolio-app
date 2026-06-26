import { type Page, expect } from '@playwright/test'

/** Inicia sesion con el usuario dev sembrado y espera el dashboard. */
export async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('dev@grootfolio.test')
  await page.getByLabel('Contrasena').fill('DevPass123!')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}
