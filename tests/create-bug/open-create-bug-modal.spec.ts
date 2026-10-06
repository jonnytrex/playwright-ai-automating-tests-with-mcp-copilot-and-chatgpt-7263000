import { expect, test } from "../fixtures/page-fixtures";
import { login } from "../test-helpers";

test.describe("Create Bug - Open create-bug modal from board", () => {
  test("should open the create-bug modal from the board page", async ({
    loginPage,
    boardPage,
  }) => {
    await login(loginPage);

    await expect(boardPage.logoutButton).toBeVisible();
    await expect(boardPage.newBugButton).toBeVisible();

    const dialog = await boardPage.openCreateBugDialog();

    await expect(dialog).toBeVisible();
    await expect(boardPage.getCreateBugField("Title")).toBeVisible();
    await expect(boardPage.getCreateBugField("Severity")).toBeVisible();
    await expect(boardPage.getCreateBugField("Owner")).toBeVisible();
    await expect(boardPage.getCreateBugField("Description")).toBeVisible();
    await expect(boardPage.getCreateBugAction("Save")).toBeVisible();
    await expect(boardPage.getCreateBugAction("Cancel")).toBeVisible();
  });
});
