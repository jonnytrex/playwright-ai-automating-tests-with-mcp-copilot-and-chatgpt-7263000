import type { Locator, Page } from "@playwright/test";

export class PlaywrightHomePage {
  readonly getStartedLink: Locator;

  constructor(readonly page: Page) {
    this.getStartedLink = page.getByRole("link", { name: "Get started" });
  }

  async goto(): Promise<void> {
    await this.page.goto("https://playwright.dev/");
  }

  async openInstallationGuide(): Promise<void> {
    await this.getStartedLink.click();
  }
}
