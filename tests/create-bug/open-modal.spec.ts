import { expect, test } from "../fixtures/page-fixtures";
import { login } from "../test-helpers";

test("opens the create-bug modal with its complete accessible form", async ({
  page,
  loginPage,
  boardPage,
}) => {
  await login(loginPage);
  await expect(boardPage.newBugButton).toBeVisible();

  let createRequestCount = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/bugs")) {
      createRequestCount += 1;
    }
  });

  const dialog = await boardPage.openCreateBugDialog();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  await expect(boardPage.getCreateBugField("Title")).toBeVisible();
  await expect(boardPage.getCreateBugField("Severity")).toBeVisible();
  await expect(boardPage.getCreateBugField("Owner")).toBeVisible();
  await expect(boardPage.getCreateBugField("Description")).toBeVisible();
  await expect(boardPage.getCreateBugAction("Save")).toBeVisible();
  await expect(boardPage.getCreateBugAction("Cancel")).toBeVisible();
  await expect(boardPage.getCreateBugAction("Close")).toBeVisible();

  await expect(boardPage.getCreateBugField("Title")).toHaveAttribute(
    "type",
    "text"
  );
  await expect(boardPage.getCreateBugField("Title")).toHaveValue("");
  await expect(boardPage.getCreateBugField("Description")).toHaveValue("");
  await expect(boardPage.getCreateBugField("Severity")).toHaveRole("combobox");
  await expect(boardPage.getCreateBugField("Severity")).toHaveValue("mid");
  await expect(
    boardPage.getCreateBugField("Severity").locator("option")
  ).toHaveText(["HIGH", "MID", "LOW"]);
  await expect(boardPage.getCreateBugField("Owner")).toHaveAttribute(
    "type",
    "text"
  );
  await expect(boardPage.getCreateBugField("Owner")).toHaveValue("buggy");
  expect(createRequestCount).toBe(0);
});
