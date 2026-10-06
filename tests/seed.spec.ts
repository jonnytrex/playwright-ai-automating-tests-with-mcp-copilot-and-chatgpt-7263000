import { expect, test } from "./fixtures/page-fixtures";
import { login } from "./test-helpers";

test(
  "logs into BuggyBoard with the first user",
  { tag: "@seed" },
  async ({ loginPage }) => {
    await login(loginPage);
    await expect(loginPage.page).toHaveURL(/\/board$/);
  }
);
