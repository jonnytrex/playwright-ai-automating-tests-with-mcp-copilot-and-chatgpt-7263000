import { expect, test } from "../fixtures/page-fixtures";
import {
  cleanupCreatedBugs,
  createFreshBug,
  login,
  type CreatedBug,
} from "../test-helpers";

test.describe("Delete bug control", () => {
  let createdBugs: CreatedBug[];
  let targetBug: CreatedBug;

  test.beforeEach(async ({ loginPage, boardPage }, testInfo) => {
    createdBugs = [];
    await login(loginPage);
    targetBug = await createFreshBug(boardPage, `${testInfo.title} target`);
    createdBugs.push(targetBug);
  });

  test.afterEach(async ({ request }) => {
    await cleanupCreatedBugs(request, createdBugs);
  });

  test("requires confirmation and leaves the bug unchanged when canceled", async ({
    page,
    boardPage,
    request,
  }) => {
    const deleteRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "DELETE" &&
        new URL(request.url()).pathname === `/api/bugs/${targetBug.id}`
      ) {
        deleteRequests.push(request.url());
      }
    });

    const detailResponse = await boardPage.openBug(targetBug);
    expect(detailResponse.status()).toBe(200);

    await expect(boardPage.getEditBugIdField(targetBug.id)).toHaveValue(
      String(targetBug.id)
    );
    await expect(boardPage.getDeleteButton(targetBug.id)).toBeVisible();
    expect(deleteRequests).toEqual([]);

    await boardPage.openDeleteConfirmation(targetBug.id);
    const confirmation = boardPage.getDeleteConfirmationDialog(targetBug.id);
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText(targetBug.title);
    await expect(
      boardPage.getDeleteConfirmationAction(targetBug.id, "Delete")
    ).toBeVisible();
    await expect(
      boardPage.getDeleteConfirmationAction(targetBug.id, "Cancel")
    ).toBeVisible();
    expect(deleteRequests).toEqual([]);
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);

    await page.keyboard.press("Escape");
    await expect(confirmation).toBeHidden();
    await expect(boardPage.getEditBugDialog(targetBug.id)).toBeVisible();
    expect(deleteRequests).toEqual([]);

    await boardPage.openDeleteConfirmation(targetBug.id);
    await boardPage.getDeleteConfirmationAction(targetBug.id, "Cancel").click();
    await expect(confirmation).toBeHidden();
    await expect(boardPage.getEditBugDialog(targetBug.id)).toBeVisible();
    expect(deleteRequests).toEqual([]);

    await boardPage.openDeleteConfirmation(targetBug.id);
    await boardPage.getDeleteConfirmationAction(targetBug.id, "Close").click();
    await expect(confirmation).toBeHidden();
    await expect(boardPage.getEditBugDialog(targetBug.id)).toBeVisible();
    await expect(boardPage.getBugRow(targetBug)).toBeVisible();
    expect(deleteRequests).toEqual([]);
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);
  });
});
