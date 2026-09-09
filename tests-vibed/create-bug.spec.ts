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

test('logs in and creates a new bug', async ({ page }) => {
  const bugTitle = `Playwright test bug ${Date.now()}`;

  await page.goto('/login');
  await page.getByLabel('Username').fill(testUser.username);
  await page.getByLabel('Password').fill(testUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/board$/);
  await page.getByRole('button', { name: 'New Bug' }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Title').fill(bugTitle);
  await page.getByLabel('Severity').selectOption('high');
  await expect(page.getByLabel('Owner')).toHaveValue(testUser.username);
  await page.getByLabel('Description').fill('Created by the Playwright end-to-end test.');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  const bugRow = page.getByRole('row').filter({ hasText: bugTitle });
  await expect(bugRow).toContainText('HIGH');
  await expect(bugRow).toContainText(testUser.username);

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'BuggyBoard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});