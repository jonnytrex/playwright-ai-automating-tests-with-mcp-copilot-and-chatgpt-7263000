import { expect, test } from "./fixtures/page-fixtures";

test("has title", async ({ playwrightHomePage }) => {
  await playwrightHomePage.goto();

  await expect(playwrightHomePage.page).toHaveTitle(/Playwright/);
});

test("get started link", async ({
  playwrightHomePage,
  playwrightInstallationPage,
}) => {
  await playwrightHomePage.goto();
  await playwrightHomePage.openInstallationGuide();

  await expect(playwrightInstallationPage.installationHeading).toBeVisible();
});
