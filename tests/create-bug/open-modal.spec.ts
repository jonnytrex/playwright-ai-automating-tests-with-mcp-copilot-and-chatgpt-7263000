import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

interface UserAccount {
  username: string;
  password: string;
}

const users = JSON.parse(
  readFileSync(resolve(process.cwd(), 'users.json'), 'utf-8'),
) as UserAccount[];
const testUser = users[0];

test('opens the create-bug modal with its complete accessible form', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill(testUser.username);
  await page.getByLabel('Password').fill(testUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole('button', { name: 'New Bug' })).toBeVisible();

  let createRequestCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/bugs')) {
      createRequestCount += 1;
    }
  });

  await page.getByRole('button', { name: 'New Bug' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create bug' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');

  await expect(dialog.getByLabel('Title')).toBeVisible();
  await expect(dialog.getByLabel('Severity')).toBeVisible();
  await expect(dialog.getByLabel('Owner')).toBeVisible();
  await expect(dialog.getByLabel('Description')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();

  await expect(dialog.getByLabel('Title')).toHaveAttribute('type', 'text');
  await expect(dialog.getByLabel('Title')).toHaveValue('');
  await expect(dialog.getByLabel('Description')).toHaveValue('');
  await expect(dialog.getByLabel('Severity')).toHaveRole('combobox');
  await expect(dialog.getByLabel('Severity')).toHaveValue('mid');
  await expect(dialog.getByLabel('Severity').locator('option')).toHaveText([
    'HIGH',
    'MID',
    'LOW',
  ]);
  await expect(dialog.getByLabel('Owner')).toHaveAttribute('type', 'text');
  await expect(dialog.getByLabel('Owner')).toHaveValue(testUser.username);
  expect(createRequestCount).toBe(0);
});