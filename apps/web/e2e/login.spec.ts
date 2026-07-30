import { test, expect } from '@playwright/test'

test('login con el usuario dev lleva al dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('dev@grootfolio.test')
  await page.locator('input[type="password"]').fill('DevPass123!')
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('credenciales invalidas muestran un error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('dev@grootfolio.test')
  await page.locator('input[type="password"]').fill('passwordincorrecto')
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await expect(page.getByText(/Email o password incorrectos/i)).toBeVisible()
})
