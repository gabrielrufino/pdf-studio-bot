import { expect, test } from '@playwright/test'

test('landing page has title and get started button', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/PDF Studio Bot/)

  // create a locator
  const getStarted = page.getByRole('link', { name: 'Get Started Now' })

  // Expect an attribute "to be" potentially a telegram link.
  await expect(getStarted).toHaveAttribute('href', 'https://t.me/PDFStudio_bot')
})

test('landing page displays features', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000')

  await expect(page.getByText('Download from URL')).toBeVisible()
  await expect(page.getByText('Add Password')).toBeVisible()
  await expect(page.getByText('Split PDF')).toBeVisible()
  await expect(page.getByText('Merge PDFs')).toBeVisible()
})
