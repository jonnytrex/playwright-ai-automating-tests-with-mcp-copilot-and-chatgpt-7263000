import { expect, test } from "../fixtures/page-fixtures";
import {
  cleanupCreatedBugs,
  createFreshBug,
  login,
  type CreatedBug,
} from "../test-helpers";

test.describe("Delete bug failure", () => {
  let createdBugs: CreatedBug[];
  let targetBug: CreatedBug;
  let deleteRoutePattern: string | undefined;

  test.beforeEach(async ({ loginPage, boardPage }, testInfo) => {
    createdBugs = [];
    deleteRoutePattern = undefined;
    await login(loginPage);
    targetBug = await createFreshBug(boardPage, `${testInfo.title} target`);
    createdBugs.push(targetBug);
  });

  test.afterEach(async ({ page, request }) => {
    if (deleteRoutePattern) await page.unroute(deleteRoutePattern);
    await cleanupCreatedBugs(request, createdBugs);
  });

  test("keeps a fresh bug after a failed delete and allows retry", async ({
    page,
    boardPage,
    request,
  }) => {
    deleteRoutePattern = `**/api/bugs/${targetBug.id}`;
    await page.route(deleteRoutePattern, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Delete failed." }),
        });
        return;
      }
      await route.continue();
    });

    const detailResponse = await boardPage.openBug(targetBug);
    expect(detailResponse.status()).toBe(200);
    await boardPage.openDeleteConfirmation(targetBug.id);
    const failedDelete = await boardPage.confirmDelete(targetBug.id);
    expect(failedDelete.status()).toBe(500);
    const dialog = boardPage.getEditBugDialog(targetBug.id);
    await expect(dialog).toBeVisible();
    await expect(boardPage.getDeleteError(targetBug.id)).toContainText(
      "Delete failed."
    );
    await expect(boardPage.getBugRow(targetBug)).toBeVisible();
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);

    await page.unroute(deleteRoutePattern);
    deleteRoutePattern = undefined;

    await boardPage.openDeleteConfirmation(targetBug.id);
    const retryResponse = await boardPage.confirmDelete(targetBug.id);
    expect(retryResponse.status()).toBe(204);
    await expect(dialog).toBeHidden();
    await expect(boardPage.getBugRow(targetBug)).toHaveCount(0);
  });
});
