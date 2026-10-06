import { expect, test } from "../fixtures/page-fixtures";
import {
  cleanupCreatedBugs,
  createFreshBug,
  login,
  type CreatedBug,
} from "../test-helpers";

test.describe("Delete bug successfully", () => {
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

  test("deletes the selected fresh bug and removes its board row", async ({
    boardPage,
    request,
  }) => {
    const detailResponse = await boardPage.openBug(targetBug);
    expect(detailResponse.status()).toBe(200);
    await boardPage.openDeleteConfirmation(targetBug.id);
    const confirmation = boardPage.getDeleteConfirmationDialog(targetBug.id);
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText(targetBug.title);
    const deleteResponse = await boardPage.confirmDelete(targetBug.id);
    expect(deleteResponse.status()).toBe(204);
    await expect(confirmation).toBeHidden();
    await expect(boardPage.getEditBugDialog(targetBug.id)).toBeHidden();
    await expect(boardPage.getBugRow(targetBug)).toHaveCount(0);

    const listResponse = await request.get("/api/bugs");
    expect(listResponse.ok()).toBe(true);
    const remainingBugs = (await listResponse.json()) as Array<{ id: number }>;
    expect(remainingBugs.some((bug) => bug.id === targetBug.id)).toBe(false);

    const deletedBugResponse = await request.get(`/api/bugs/${targetBug.id}`);
    expect(deletedBugResponse.status()).toBe(404);
  });
});
