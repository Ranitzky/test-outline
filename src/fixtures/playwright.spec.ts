// @ts-nocheck
import { test, expect } from '@playwright/test';

// test.describe(...) is parsed as a describe-node (word boundary before 'describe')
// test(...)         is parsed as an it-node
// test.skip(...)    is parsed as an it-node with modifier:skip
// test.only(...)    is parsed as an it-node with modifier:only

test.describe('homepage', () => {
  test('has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/My App/);
  });

  test.skip('has visible navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
  });

  test.describe('hero section', () => {
    test('shows headline', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('Welcome');
    });

    test.only('shows CTA button', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid=cta]')).toBeVisible();
    });
  });
});

test.describe('authentication', () => {
  test('can log in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=password]', 'secret');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('shows error on wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=password]', 'wrong');
    await page.click('button[type=submit]');
    await expect(page.locator('.error')).toBeVisible();
  });

  test.describe.skip('OAuth flows', () => {
    test('can sign in with Google', async ({ page }) => {
      await page.goto('/login');
      await page.click('[data-testid=google-signin]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('can sign in with GitHub', async ({ page }) => {
      await page.goto('/login');
      await page.click('[data-testid=github-signin]');
      await expect(page).toHaveURL('/dashboard');
    });
  });
});
