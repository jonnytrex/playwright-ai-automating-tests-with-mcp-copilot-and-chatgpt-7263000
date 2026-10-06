import type { Locator, Page } from "@playwright/test";

export class PlaywrightInstallationPage {
  readonly installationHeading: Locator;

  constructor(readonly page: Page) {
    this.installationHeading = page.getByRole("heading", {
      name: "Installation",
    });
  }
}
