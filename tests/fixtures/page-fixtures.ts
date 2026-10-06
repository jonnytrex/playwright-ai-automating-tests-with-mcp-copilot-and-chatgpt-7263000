import { test as base, expect } from "@playwright/test";
import { BoardPage } from "../pages/board-page";
import { LoginPage } from "../pages/login-page";
import { PlaywrightHomePage } from "../pages/playwright-home-page";
import { PlaywrightInstallationPage } from "../pages/playwright-installation-page";

interface PageObjectFixtures {
  boardPage: BoardPage;
  loginPage: LoginPage;
  playwrightHomePage: PlaywrightHomePage;
  playwrightInstallationPage: PlaywrightInstallationPage;
}

export { expect };

export const test = base.extend<PageObjectFixtures>({
  boardPage: async ({ page }, use) => {
    await use(new BoardPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  playwrightHomePage: async ({ page }, use) => {
    await use(new PlaywrightHomePage(page));
  },
  playwrightInstallationPage: async ({ page }, use) => {
    await use(new PlaywrightInstallationPage(page));
  },
});
