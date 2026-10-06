import { expect, test } from "../fixtures/page-fixtures";
import {
  cleanupCreatedBugs,
  createFreshBug,
  login,
  testUser,
  type CreatedBug,
} from "../test-helpers";

interface BugRecord extends CreatedBug {
  severity: string;
  state: string;
  owner: string;
  description: string;
}

test.describe("Edit bug modal", () => {
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

  test("opens a fresh bug in the complete edit modal", async ({
    page,
    boardPage,
  }) => {
    let putRequestCount = 0;
    let deleteRequestCount = 0;
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (
        pathname === `/api/bugs/${targetBug.id}` &&
        request.method() === "PUT"
      ) {
        putRequestCount += 1;
      }
      if (
        pathname === `/api/bugs/${targetBug.id}` &&
        request.method() === "DELETE"
      ) {
        deleteRequestCount += 1;
      }
    });

    const detailResponse = await boardPage.openBug(targetBug);
    expect(detailResponse.status()).toBe(200);
    const bug = (await detailResponse.json()) as BugRecord;
    const dialog = boardPage.getEditBugDialog(targetBug.id);

    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(boardPage.getEditBugField(targetBug.id, "ID")).toHaveValue(
      String(targetBug.id)
    );
    await expect(boardPage.getEditBugField(targetBug.id, "Title")).toHaveValue(
      targetBug.title
    );
    await expect(
      boardPage.getEditBugField(targetBug.id, "Severity")
    ).toHaveValue("mid");
    await expect(boardPage.getEditBugField(targetBug.id, "State")).toHaveValue(
      "open"
    );
    await expect(boardPage.getEditBugField(targetBug.id, "Owner")).toHaveValue(
      testUser.username
    );
    await expect(
      boardPage.getEditBugField(targetBug.id, "Description")
    ).toHaveValue(`Test data for ${targetBug.title}`);

    expect(bug).toMatchObject({
      id: targetBug.id,
      title: targetBug.title,
      severity: "MID",
      state: "OPEN",
      owner: testUser.username,
      description: `Test data for ${targetBug.title}`,
    });

    await expect(
      boardPage.getEditBugAction(targetBug.id, "Save")
    ).toBeVisible();
    await expect(
      boardPage.getEditBugAction(targetBug.id, "Cancel")
    ).toBeVisible();
    await expect(
      boardPage.getEditBugAction(targetBug.id, "Close")
    ).toBeVisible();
    await expect(boardPage.getDeleteButton(targetBug.id)).toBeVisible();
    expect(putRequestCount).toBe(0);
    expect(deleteRequestCount).toBe(0);
  });
});
