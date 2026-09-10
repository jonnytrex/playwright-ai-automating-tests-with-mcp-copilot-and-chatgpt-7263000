import { test, expect } from '@playwright/test';

const bugData = [
  { title: 'Login page crashes on empty password', severity: 'HIGH', owner: 'buggy', description: 'App crashes when submitting an empty password on login.' },
  { title: 'Login page redirect fails after auth', severity: 'MID', owner: 'buggy', description: 'User is not redirected to board after successful login.' },
  { title: 'Login page error message not shown', severity: 'LOW', owner: 'buggy', description: 'No error message appears for invalid credentials.' },
  { title: 'Login page enter key stops working', severity: 'MID', owner: 'buggy', description: 'Enter key does not submit the login form.' },
  { title: 'Board page fails to load', severity: 'HIGH', owner: 'buggy', description: 'The bug board is empty even when bugs exist in the database.' },
  { title: 'Search field disappears on page resize', severity: 'LOW', owner: 'buggy', description: 'The search input is not visible after resizing the window.' },
  { title: 'Severity dropdown missing on create page', severity: 'MID', owner: 'buggy', description: 'The severity dropdown does not render in the create bug modal.' },
  { title: 'Create page modal does not close on cancel', severity: 'LOW', owner: 'buggy', description: 'The create bug modal stays open after clicking Cancel.' },
  { title: 'Title bar logo missing on page load', severity: 'LOW', owner: 'buggy', description: 'The logo image does not appear in the title bar.' },
  { title: 'Sort resets on page refresh', severity: 'MID', owner: 'buggy', description: 'Sorting order is lost when the page is refreshed.' },
];

test.describe('Search Bug', () => {
  let createdBugIds: number[] = [];

  test.beforeEach(async ({ page, request }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('buggy');
    await page.getByLabel('Password').fill('1970beetle');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/\/board$/);

    createdBugIds = [];
    for (const bug of bugData) {
      const response = await request.post('/api/bugs', { data: bug });
      const body = await response.json();
      createdBugIds.push(body.id);
    }

    await page.reload();
  });

  test.afterEach(async ({ request }) => {
    for (const id of createdBugIds) {
      await request.delete(`/api/bugs/${id}`);
    }
    createdBugIds = [];
  });

  test('shows every bug when searching for a common title word', async ({ page }) => {
    const searchInput = page.getByRole('search', { name: 'Search bugs by title' });

    await searchInput.fill('page');

    await expect(page.getByRole('cell', { name: 'Login page crashes on empty password', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Login page redirect fails after auth', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Login page error message not shown', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Login page enter key stops working', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Board page fails to load', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Search field disappears on page resize', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Severity dropdown missing on create page', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Create page modal does not close on cancel', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Title bar logo missing on page load', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Sort resets on page refresh', exact: true })).toBeVisible();
  });

  test('shows only matching bugs when searching by a specific word', async ({ page }) => {
    const searchInput = page.getByRole('search', { name: 'Search bugs by title' });

    await searchInput.fill('login');

    await expect(page.getByRole('cell', { name: 'Login page crashes on empty password', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Login page redirect fails after auth', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Login page error message not shown', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Login page enter key stops working', exact: true })).toBeVisible();

    await expect(page.getByRole('cell', { name: 'Board page fails to load', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Search field disappears on page resize', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Severity dropdown missing on create page', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Create page modal does not close on cancel', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Title bar logo missing on page load', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Sort resets on page refresh', exact: true })).not.toBeVisible();
  });

  test('shows a no-results message for an unmatched search', async ({ page }) => {
    const searchInput = page.getByRole('search', { name: 'Search bugs by title' });

    await searchInput.fill('xyzzy');

    await expect(page.getByRole('cell', { name: 'No bugs matched.', exact: true })).toBeVisible();

    for (const bug of bugData) {
      await expect(page.getByRole('cell', { name: bug.title, exact: true })).not.toBeVisible();
    }
  });
});