import { test, expect } from '@playwright/test'

test.describe('App smoke', () => {
  test('login page loads and shows sign in', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 10000 })
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible({ timeout: 10000 })
  })

  test('root redirects to dashboard route', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/(login|dashboard|setup)/, { timeout: 15000 })
  })
})
