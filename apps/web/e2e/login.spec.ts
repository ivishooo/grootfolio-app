import { test, expect } from '@playwright/test'

test('login con el usuario dev lleva al dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('dev@grootfolio.test')
  await page.getByLabel('Contraseña').fill('DevPass123!')
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('credenciales invalidas muestran un error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('dev@grootfolio.test')
  await page.getByLabel('Contraseña').fill('passwordincorrecto')
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await expect(page.getByText(/Email o password incorrectos/i)).toBeVisible()
})
