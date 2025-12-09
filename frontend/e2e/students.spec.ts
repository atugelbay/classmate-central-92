import { test, expect } from '@playwright/test'

test.describe('Students Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('should create a new student', async ({ page }) => {
    await page.goto('/students')
    
    // Click add student button
    await page.click('button:has-text("Добавить студента")')
    
    // Fill form
    await page.fill('input[name="name"]', 'Новый Студент')
    await page.fill('input[name="email"]', 'student@example.com')
    await page.fill('input[name="phone"]', '+77001234567')
    
    // Submit
    await page.click('button:has-text("Создать")')
    
    // Should see new student in list
    await expect(page.locator('text=Новый Студент')).toBeVisible()
  })

  test('should display students list', async ({ page }) => {
    await page.goto('/students')
    
    // Should see students table or list
    await expect(page.locator('table, [role="table"]')).toBeVisible()
  })
})

