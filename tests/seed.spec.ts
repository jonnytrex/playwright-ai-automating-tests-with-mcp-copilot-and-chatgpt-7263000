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

test('logs into BuggyBoard with the first user', { tag: '@seed' }, async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill(testUser.username);
  await page.getByLabel('Password').fill(testUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/board$/);
});
