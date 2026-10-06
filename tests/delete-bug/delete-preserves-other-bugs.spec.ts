import { expect, test } from "../fixtures/page-fixtures";
import {
  cleanupCreatedBugs,
  createFreshBug,
  login,
  type CreatedBug,
} from "../test-helpers";

test.describe("Delete bug target isolation", () => {
  let createdBugs: CreatedBug[];
  let targetBug: CreatedBug;
  let companionBug: CreatedBug;

  test.beforeEach(async ({ loginPage, boardPage }, testInfo) => {
    createdBugs = [];
    await login(loginPage);
    targetBug = await createFreshBug(boardPage, `${testInfo.title} target`);
    createdBugs.push(targetBug);
    companionBug = await createFreshBug(
      boardPage,
      "Delete isolation companion"
    );
    createdBugs.push(companionBug);
  });

  test.afterEach(async ({ request }) => {
    await cleanupCreatedBugs(request, createdBugs);
  });

  test("deletes only the target and leaves another fresh bug untouched", async ({
    page,
    boardPage,
    request,
  }) => {
    const deletedIds: number[] = [];
    page.on("request", (requestEvent) => {
      if (
        requestEvent.method() === "DELETE" &&
        new URL(requestEvent.url()).pathname.startsWith("/api/bugs/")
      ) {
        deletedIds.push(
          Number(new URL(requestEvent.url()).pathname.split("/").at(-1))
        );
      }
    });

    const detailResponse = await boardPage.openBug(targetBug);
    expect(detailResponse.status()).toBe(200);
    await boardPage.openDeleteConfirmation(targetBug.id);
    const deleteResponse = await boardPage.confirmDelete(targetBug.id);
    expect(deleteResponse.status()).toBe(204);
    await expect(boardPage.getEditBugDialog(targetBug.id)).toBeHidden();
    await expect(boardPage.getBugRow(targetBug)).toHaveCount(0);
    await expect(boardPage.getBugRow(companionBug)).toBeVisible();
    expect(deletedIds).toEqual([targetBug.id]);

    const listResponse = await request.get("/api/bugs");
    expect(listResponse.ok()).toBe(true);
    const remainingBugs = (await listResponse.json()) as Array<{ id: number }>;
    expect(remainingBugs.some((bug) => bug.id === targetBug.id)).toBe(false);
    expect(remainingBugs.some((bug) => bug.id === companionBug.id)).toBe(true);
  });
});
