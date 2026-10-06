import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";
import type { BoardPage, BugIdentity } from "./pages/board-page";
import type { LoginPage } from "./pages/login-page";

interface UserAccount {
  username: string;
  password: string;
}

interface BugResponse {
  id: number;
}

export type CreatedBug = BugIdentity;

const users = JSON.parse(
  readFileSync(resolve(process.cwd(), "users.json"), "utf-8")
) as UserAccount[];
export const testUser = users[0];

export async function login(loginPage: LoginPage): Promise<void> {
  await loginPage.goto();
  await loginPage.login(testUser.username, testUser.password);
  await expect(loginPage.page).toHaveURL(/\/board$/);
}

export async function createFreshBug(
  boardPage: BoardPage,
  label: string
): Promise<CreatedBug> {
  const title = `${label} ${randomUUID()}`;
  const createResponse = await boardPage.createBug({
    title,
    severity: "mid",
    owner: testUser.username,
    description: `Test data for ${title}`,
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as BugResponse;
  expect(Number.isInteger(created.id)).toBe(true);

  const bug = { id: created.id, title };
  await expect(boardPage.getBugRow(bug)).toBeVisible();
  return bug;
}

export async function cleanupCreatedBugs(
  request: APIRequestContext,
  bugs: CreatedBug[]
): Promise<void> {
  for (const bug of bugs) {
    const existingBugResponse = await request.get(`/api/bugs/${bug.id}`);
    if (existingBugResponse.status() === 404) continue;

    expect(existingBugResponse.status()).toBe(200);
    const deletionResponse = await request.delete(`/api/bugs/${bug.id}`);
    expect(deletionResponse.status()).toBe(204);
  }
}
